"""Bounded, offline preflight for normalized ClinicalTrials.gov result exports."""
import csv, hashlib, io, json, re
from collections import Counter
from datetime import date
MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 10000
MAX_ISSUES = 1000

class InputError(ValueError):
    pass

def audit(payload):
    if not isinstance(payload, dict) or set(payload) - {"studiesCsv", "outcomesCsv"}:
        raise InputError("Only studiesCsv and outcomesCsv are supported.")
    tables = {}
    hashes = {}
    total = 0
    for key, required in (("studiesCsv", {"trial_id", "condition", "phase"}),
                          ("outcomesCsv", {"trial_id", "outcome_id", "outcome_type", "primary_endpoint", "result_status", "results_first_post_date"})):
        text = payload.get(key)
        if not isinstance(text, str) or not text.strip():
            raise InputError(f"{key} must contain CSV text.")
        total += len(text.encode("utf-8"))
        if total > MAX_BYTES:
            raise InputError("Combined CSV input exceeds 5 MiB.")
        hashes[key] = hashlib.sha256(text.encode("utf-8")).hexdigest()
        reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff"), newline=""), strict=True)
        try:
            header = reader.fieldnames
            if not header or len(header) > 40 or len(header) != len(set(header)) or not required.issubset(header):
                raise InputError(f"{key}: unique headers and required columns are mandatory (maximum 40).")
            rows = []
            for row in reader:
                if len(rows) >= MAX_ROWS:
                    raise InputError(f"{key}: maximum 10000 rows.")
                if None in row or any(v is None for v in row.values()):
                    raise InputError(f"{key}: inconsistent column count.")
                rows.append({k: v.strip() for k, v in row.items()})
            if not rows:
                raise InputError(f"{key}: at least one data row is required.")
        except csv.Error as exc:
            raise InputError(f"{key}: malformed or oversized CSV field.") from exc
        tables[key] = (rows, required)
    issues, counts, coverage = [], Counter(), {}
    def flag(table, row, field, code):
        counts[code] += 1
        if len(issues) < MAX_ISSUES:
            issues.append(dict(table=table, record=row, field=field, code=code))
    for table, (rows, required) in tables.items():
        coverage[table] = {f: round(sum(bool(r[f]) for r in rows) / len(rows), 6) for f in sorted(required)}
        keys = set()
        for i, row in enumerate(rows, 1):
            for f in sorted(required):
                if not row[f]: flag(table, i, f, "MISSING_VALUE")
            if not re.fullmatch(r"NCT[0-9]{8}", row["trial_id"]):
                flag(table, i, "trial_id", "INVALID_NCT_ID")
            key = (row["trial_id"], row.get("outcome_id"))
            if key in keys: flag(table, i, "trial_id" if table == "studiesCsv" else "outcome_id", "DUPLICATE_KEY")
            keys.add(key)
    parents = {r["trial_id"] for r in tables["studiesCsv"][0]}
    for i, row in enumerate(tables["outcomesCsv"][0], 1):
        if row["trial_id"] not in parents: flag("outcomesCsv", i, "trial_id", "ORPHAN_OUTCOME")
        if row["outcome_type"] not in {"PRIMARY", "SECONDARY", "OTHER_PRE_SPECIFIED"}:
            flag("outcomesCsv", i, "outcome_type", "INVALID_OUTCOME_TYPE")
        value = row["results_first_post_date"]
        try:
            if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value): raise ValueError()
            date.fromisoformat(value)
        except ValueError:
            flag("outcomesCsv", i, "results_first_post_date", "INVALID_ISO_DATE")
    return dict(schemaVersion=1, status="PASS" if not counts else "FAIL", rowCounts={k:len(v[0]) for k,v in tables.items()},
                fieldCoverage=coverage, issueCount=sum(counts.values()), issueCounts=dict(sorted(counts.items())),
                issues=issues, issuesTruncated=sum(counts.values()) > MAX_ISSUES, inputSha256=hashes,
                scope="Structural QA only; no source authenticity, clinical accuracy, freshness, regulatory compliance or reuse-rights certification.")

if __name__ == "__main__":
    import sys
    try:
        raw = sys.stdin.buffer.read(MAX_BYTES + 1024 * 1024 + 1)
        if len(raw) > MAX_BYTES + 1024 * 1024: raise InputError("JSON input exceeds 6 MiB.")
        print(json.dumps(audit(json.loads(raw)), indent=2))
    except (InputError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(2)

"""Server-side catalog: the facts the API routes enforce (price, size limits).

Keep in sync with src/catalog.js, which drives the website. scripts/check-catalog.mjs compares the two.
"""

# Vercel rejects request bodies above 4.5 MB before a function runs. Stay under it with headroom.
VERCEL_BODY_LIMIT = 4_500_000

APIS = {
    'clinical-trial-table-validator': {
        'name': 'Clinical Trial Results Table QA',
        'price_cents': 25,
        'max_body_bytes': 4_400_000,
        'demo_max_body_bytes': 512 * 1024,
    },
    'hospital-mrf-validator': {
        'name': 'Hospital Price Transparency MRF Validator',
        'price_cents': 25,
        'max_body_bytes': 4_400_000,
        'demo_max_body_bytes': 2 * 1024 * 1024,
        # Bounded sampling: records inspected per run.
        'default_max_records': 100,
        'max_records': 1000,
        'demo_max_records': 100,
        # Gzip uploads are expanded up to this many bytes; anything past it is reported as not inspected.
        'max_decompressed_bytes': 16 * 1024 * 1024,
    },
    'uad-36-appraisal-validator': {
        'name': 'UAD 3.6 Appraisal Report Validator',
        'price_cents': 100,
        # Whole-file validation, no sampling. UAD XML references photos by file name, so reports are
        # usually well under this; a file with embedded content above it is rejected with 413, not sampled.
        'max_body_bytes': 4_400_000,
        'demo_max_body_bytes': 1024 * 1024,
    },
    'pbj-staffing-qa': {
        'name': 'PBJ Staffing Data Pre-Submission QA',
        'price_cents': 100,
        # Whole-file validation, no sampling. Large facilities' quarterly files can pass 4.4 MB as plain XML;
        # gzip or ZIP uploads (what CMS takes) are accepted; each XML inside may expand to 50 MB.
        'max_body_bytes': 4_400_000,
        'demo_max_body_bytes': 1024 * 1024,
    },
}

DEMO_RUNS_PER_DAY = 10

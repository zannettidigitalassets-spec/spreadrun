"""Bounded structural QA. No regulatory or price-accuracy determination."""
import csv, io, json, re, hashlib
from collections import Counter
from pathlib import Path
from decimal import Decimal, InvalidOperation
import ijson
from ijson.common import ObjectBuilder
from jsonschema import Draft7Validator, FormatChecker

ROOT=Path(__file__).parent
SCHEMA=json.loads((ROOT/'vendor/cms-v3.0.0.schema.json').read_text())
ATTEST=SCHEMA['definitions']['attestation']['properties']['attestation']['const']
META=[x for x in SCHEMA['required'] if x!='standard_charge_information']
LIMITATIONS=['Structural preflight only; not CMS certification, legal advice, pricing accuracy or completeness verification.', 'Uninspected records and trailing syntax are not validated. No NPI registry, source-authenticity or annual freshness verification.', 'Duplicate keys checked within parsed scope; duplicate business records and cross-record pricing relationships are not checked.', 'Only CMS v3.0.0 JSON and comma-separated tall/wide CSV; UTF-8 only. ZIP and concatenated gzip unsupported.']

def error_location(error,base):
    # Only known CMS property names are exposed; never arbitrary source keys.
    known=set()
    def collect(node):
        if isinstance(node,dict):
            known.update(node.get('properties',{}))
            for value in node.values(): collect(value)
        elif isinstance(node,list):
            for value in node: collect(value)
    collect(SCHEMA)
    parts=[str(x) if isinstance(x,int) or x in known else '[field]' for x in error.absolute_path]
    if error.validator=='required' and isinstance(error.instance,dict):
        parts.extend(k for k in error.validator_value if k not in error.instance and k in known)
    return base+('.'+'.'.join(parts) if parts else '')

def norm(s): return '|'.join(x.strip().lower() for x in s.strip().split('|'))

class Report:
    def __init__(self,cfg,source,file):
        self.cfg=cfg; self.issues=[]; self.counts=Counter(); self.checked=0; self.present=Counter(); self.metadata=None; self.structure=None; self.parseable=None
        self.source=source; self.file=file; self.partial=file['truncatedByLimit']; self.format='unknown'
    def issue(self,code,location='',severity='ERROR'):
        self.counts[severity]+=1
        if len(self.issues)<100: self.issues.append({'severity':severity,'code':code,'location':location[:160],'message':MESSAGES.get(code,code.replace('_',' ').capitalize())})
    def schema(self,obj,kind,location):
        schema=SCHEMA if kind=='root' else {'$ref':'#/definitions/'+kind,'definitions':SCHEMA['definitions']}
        count=0
        for error in Draft7Validator(schema,format_checker=FormatChecker()).iter_errors(obj):
            # Do not echo values, user field names or jsonschema messages into a report.
            self.issue('SCHEMA_'+error.validator.upper(),error_location(error,location)); count+=1
            if count>=1000: self.issue('CHECK_LIMIT',location,'WARNING'); self.partial=True; break
        return count==0
    def finish(self):
        if self.partial: self.issue('SAMPLE_LIMIT','','WARNING')
        status='FAIL' if self.counts['ERROR'] else ('WARN' if self.counts['WARNING'] else 'PASS')
        self.source['format']=self.format
        self.source['encoding']='UTF-8' if self.parseable else None
        self.file.update(recordsInspected=self.checked,truncatedByLimit=self.partial)
        return {'schemaVersion':1,'status':status,'validationMode':self.cfg['validationMode'],'source':self.source,'cmsProfile':{'requirementVersion':'3.0.0','source':'CMS','fullComplianceCertification':False},'file':self.file,'checks':{'reachable':True,'parseable':self.parseable,'requiredMetadataPresent':self.metadata,'requiredStructurePresent':self.structure},'coverage':{'recordCount':self.checked,'requiredRecordFieldPresence':{k:round(self.present[k]/self.checked,4) if self.checked else None for k in ('description','code_information','standard_charges')}},'issueCounts':dict(self.counts),'issues':self.issues,'issuesOmitted':sum(self.counts.values())-len(self.issues),'summary':{'safeForDownstreamIngestion':False if status=='FAIL' else (None if status=='WARN' else True),'notes':['PASS applies only to the inspected structural profile. WARN requires review; uninspected content is unknown.']},'limitations':LIMITATIONS}
    def record(self,obj):
        self.checked+=1
        for key in ('description','code_information','standard_charges'):
            if isinstance(obj,dict) and obj.get(key): self.present[key]+=1
        self.schema(obj,'standard_charge_information',f'record[{self.checked}]')

MESSAGES={'SAMPLE_LIMIT':'Bounded inspection: uninspected content, metadata or trailing syntax remains unknown.','UNSUPPORTED_FORMAT':'Unsupported content format or encoding.','PARSER_ERROR':'Source syntax could not be parsed.','DUPLICATE_KEY':'Duplicate JSON key makes interpretation ambiguous.','DUPLICATE_HEADER':'Duplicate normalized CSV header.','MISSING_HEADER':'Required CMS template column missing.','ROW_WIDTH':'CSV row width differs from its header.','EMPTY_FILE':'No standard-charge records inspected.','VERSION':'This file declares a version other than supported CMS 3.0.0.','INVALID_NUMBER':'Numeric field is malformed, non-finite, or non-positive.','METADATA_UNSEEN':'Required metadata was not reached within the bounded inspection.','HEADER_PLACEHOLDER':'Unresolved placeholder in a CSV header.','HTTP_PLAINTEXT':'Unencrypted HTTP source; integrity in transit is not guaranteed.','CHECK_LIMIT':'Validation complexity limit reached.'}

def metadata(r,obj,complete):
    missing=[k for k in META if k not in obj]
    if missing and not complete:
        r.issue('METADATA_UNSEEN','','WARNING'); r.metadata=None
    else: r.metadata=not missing
    sample={k:v for k,v in obj.items() if k!='standard_charge_information'}
    schema=dict(SCHEMA); schema['required']=[k for k in META if complete or k in obj]; schema['properties']={k:v for k,v in SCHEMA['properties'].items() if k!='standard_charge_information'}
    errors=list(Draft7Validator(schema,format_checker=FormatChecker()).iter_errors(sample))
    for e in errors[:1000]: r.issue('SCHEMA_'+e.validator.upper(),error_location(e,'metadata'))
    if errors: r.metadata=False
    if 'version' in obj and obj['version']!='3.0.0': r.issue('VERSION','metadata.version')

def json_audit(stream,r):
    builder=ObjectBuilder(); stacks=[]; records=0; complete=False; skip=False; rec=None; depth=0; event_count=0; top_array=False
    try:
        for prefix,event,value in ijson.parse(stream):
            event_count+=1
            if event_count>250000: r.partial=True; r.issue('CHECK_LIMIT','','WARNING'); break
            if event=='start_map': stacks.append(set())
            elif event=='map_key' and stacks:
                if value in stacks[-1]: r.issue('DUPLICATE_KEY','json object')
                stacks[-1].add(value)
            elif event=='end_map': stacks.pop()
            if prefix=='standard_charge_information' and event=='start_array':
                top_array=True; skip=True; continue
            if skip:
                if prefix=='standard_charge_information' and event=='end_array': skip=False; continue
                if rec is None:
                    if prefix=='standard_charge_information.item':
                        if records>=r.cfg['maxRecords'] or r.cfg['validationMode']=='preflight': r.partial=True; break
                        rec=ObjectBuilder(); depth=0
                    else: continue
                rec.event(event,value)
                if event in ('start_map','start_array'): depth+=1
                elif event in ('end_map','end_array'): depth-=1
                if depth==0:
                    r.record(rec.value); records+=1; rec=None
                continue
            # Exclude the huge records array from metadata; no raw record is retained after validation.
            if event=='map_key' and prefix=='' and value=='standard_charge_information': continue
            builder.event(event,value)
        else: complete=True
        r.parseable=True
    except (ijson.JSONError,ValueError,UnicodeError):
        if r.file['truncatedByLimit']: r.partial=True; r.parseable=True if r.checked else None
        else: r.issue('PARSER_ERROR','json'); r.parseable=False
    except (RecursionError,OverflowError): r.issue('CHECK_LIMIT','','WARNING'); r.partial=True
    obj=getattr(builder,'value',{})
    if not isinstance(obj,dict): r.issue('SCHEMA_TYPE','root'); obj={}
    metadata(r,obj,complete)
    r.structure=top_array
    if not top_array and complete: r.issue('MISSING_HEADER','standard_charge_information')
    if complete and records==0: r.issue('EMPTY_FILE')

NUMERIC={'gross':'gross_charge','discounted_cash':'discounted_cash','min':'minimum','max':'maximum','negotiated_dollar':'standard_charge_dollar','negotiated_percentage':'standard_charge_percentage','median_amount':'median_amount','10th_percentile':'10th_percentile','90th_percentile':'90th_percentile'}

def number(value,r,loc):
    try:
        if not re.fullmatch(r'(?:\d+(?:\.\d*)?|\.\d+)',value): raise InvalidOperation()
        n=Decimal(value)
        if not n.is_finite() or n<=0: raise InvalidOperation()
        return n
    except InvalidOperation: r.issue('INVALID_NUMBER',loc); return value

def csv_record(row,r):
    obj={'description':row.get('description',''),'code_information':[],'standard_charges':[]}
    for h,v in row.items():
        if re.fullmatch(r'code\|\d+',h) and v: obj['code_information'].append({'code':v,'type':row.get(h+'|type','').upper()})
    charge={'setting':row.get('setting','').lower()}; payers={}
    for h,v in row.items():
        if not v: continue
        bits=h.split('|'); key=bits[-1]
        if len(bits)==2 and bits[0]=='standard_charge' and key in ('gross','discounted_cash','min','max'): charge[NUMERIC[key]]=number(v,r,'record charge')
        if len(bits)==4 and bits[0]=='standard_charge': group=(bits[1],bits[2]); field=bits[3]
        elif len(bits)==3 and bits[0] in ('median_amount','10th_percentile','90th_percentile','count','additional_payer_notes'): group=(bits[1],bits[2]); field=bits[0]
        elif h in ('payer_name','plan_name','median_amount','10th_percentile','90th_percentile','count','additional_payer_notes') or (len(bits)==2 and bits[0]=='standard_charge' and key in ('negotiated_dollar','negotiated_percentage','negotiated_algorithm','methodology')):
            group=(row.get('payer_name',''),row.get('plan_name','')); field=key
        else: continue
        payer=payers.setdefault(group,{'payer_name':group[0],'plan_name':group[1]})
        if field in NUMERIC: payer[NUMERIC[field]]=number(v,r,'record payer charge')
        elif field=='negotiated_algorithm': payer['standard_charge_algorithm']=v
        elif field not in ('payer_name','plan_name'): payer[field]=v.lower() if field=='methodology' else v
    if payers: charge['payers_information']=list(payers.values())
    if row.get('additional_generic_notes'): charge['additional_generic_notes']=row['additional_generic_notes']
    if row.get('drug_unit_of_measurement') or row.get('drug_type_of_measurement'): obj['drug_information']={'unit':number(row.get('drug_unit_of_measurement',''),r,'drug'),'type':row.get('drug_type_of_measurement','').upper()}
    obj['standard_charges']=[charge]; return obj

def headers(raw,r,metadata_row=False):
    if len(raw)>4096: raise csv.Error('Column limit')
    out=[norm(x) for x in raw]
    used=[x for x in out if x]
    if len(set(used))!=len(used): r.issue('DUPLICATE_HEADER')
    if any('[' in x or ']' in x for x in used): r.issue('HEADER_PLACEHOLDER')
    if not metadata_row and any(not x for x in out): r.issue('MISSING_HEADER')
    return out

def complete_rows(reader,truncated):
    if not truncated:
        yield from reader
        return
    previous=None
    for row in reader:
        if previous is not None: yield previous
        previous=row
    # Last row can be a partial logical row. Conservatively omit it.

def csv_audit(stream,r):
    csv.field_size_limit(1024*1024)
    reader=csv.reader(io.TextIOWrapper(stream,encoding='utf-8-sig',errors='strict',newline=''),strict=True)
    try:
        mh=headers(next(reader),r,True); mv=next(reader); rh=headers(next(reader),r)
        m=dict(zip(mh,mv)); license_headers=[k for k in mh if k.startswith('license_number|')]
        meta={k:m[k] for k in ('hospital_name','last_updated_on','version') if k in m}
        for k in ('location_name','hospital_address','type_2_npi'):
            if k in m: meta[k]=[x.strip() for x in m[k].split('|') if x.strip()]
        if license_headers: meta['license_information']={'state':license_headers[0].split('|')[-1].upper()}
        if norm(ATTEST) in m: meta['attestation']={'attestation':ATTEST,'confirm_attestation':m[norm(ATTEST)].strip().lower()=='true','attester_name':m.get('attester_name','')}
        if norm(ATTEST) in m and m[norm(ATTEST)].strip().lower() not in ('true','false'): r.issue('SCHEMA_TYPE','metadata.attestation')
        metadata(r,meta,True)
        wide='payer_name' not in rh
        template=list(csv.reader(io.StringIO((ROOT/('vendor/wide.csv' if wide else 'vendor/tall.csv')).read_text())))[2]
        missing=0
        for expected in template:
            pattern=re.escape(norm(expected)).replace(r'\[i\]',r'\d+').replace(r'\[payer_name\]',r'[^|]+').replace(r'\[plan_name\]',r'[^|]+')
            if not any(re.fullmatch(pattern,h) for h in rh): r.issue('MISSING_HEADER','record header'); missing+=1
        r.structure=missing==0; r.parseable=True
        if r.cfg['validationMode']=='preflight': r.partial=True; return
        for values in complete_rows(reader,r.file['truncatedByLimit']):
            if r.checked>=r.cfg['maxRecords']: r.partial=True; break
            if len(values)!=len(rh): r.issue('ROW_WIDTH',f'record[{r.checked+1}]')
            r.record(csv_record(dict(zip(rh,(v.strip() for v in values))),r))
        if r.checked==0 and not r.partial: r.issue('EMPTY_FILE')
    except (csv.Error,UnicodeError,StopIteration):
        if r.file['truncatedByLimit']: r.partial=True; r.parseable=True if r.checked else None
        else: r.issue('PARSER_ERROR','csv'); r.parseable=False

def audit(stream,cfg,source,file):
    r=Report(cfg,source,file)
    if source['url'].startswith('http:'): r.issue('HTTP_PLAINTEXT','','WARNING')
    peek=stream.read(4096); stream.seek(0)
    prefix=peek.lstrip(b'\xef\xbb\xbf \t\r\n')
    if source.get('unsupportedEncoding') or prefix.startswith((b'PK',b'<',b'%PDF')):
        r.issue('UNSUPPORTED_FORMAT')
    elif prefix.startswith((b'{',b'[')):
        r.format='json'
        if peek.startswith(b'\xef\xbb\xbf'): stream.seek(3)
        json_audit(stream,r)
    elif b',' in peek:
        r.format='csv'; csv_audit(stream,r)
    else: r.issue('UNSUPPORTED_FORMAT')
    return r.finish()

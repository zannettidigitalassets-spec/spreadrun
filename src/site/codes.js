// Plain-language meaning of every issue code the validators can emit. Taken from the DataForge validator
// source (clinical: validator.py rules; MRF: MESSAGES plus jsonschema keyword names).
export const CLINICAL_CODES = {
  MISSING_VALUE: 'A required column is empty in this row.',
  INVALID_NCT_ID: 'trial_id is not "NCT" followed by exactly 8 digits.',
  DUPLICATE_KEY: 'Repeats an earlier row: trial_id in the studies table, trial_id plus outcome_id in the outcomes table.',
  ORPHAN_OUTCOME: 'The outcome points to a trial_id that has no row in the studies table.',
  INVALID_OUTCOME_TYPE: 'outcome_type is not PRIMARY, SECONDARY or OTHER_PRE_SPECIFIED.',
  INVALID_ISO_DATE: 'results_first_post_date is not a real calendar date written as YYYY-MM-DD.',
};

export const MRF_CODES = {
  SCHEMA_REQUIRED: 'A field the CMS v3.0.0 schema requires is missing (for example count, median_amount or methodology).',
  SCHEMA_TYPE: 'A value has the wrong type for the CMS schema (for example text where a number belongs).',
  SCHEMA_ENUM: 'A value is not in the list CMS allows (for example a billing code type or methodology).',
  SCHEMA_FORMAT: 'A value is not in the required format (for example last_updated_on is not a valid date).',
  SCHEMA_EXCLUSIVEMINIMUM: 'A charge or amount is zero or negative.',
  SCHEMA_MINLENGTH: 'A required text field is empty.',
  SCHEMA_MINITEMS: 'A required list is empty (for example type_2_npi).',
  SCHEMA_PATTERN: 'A value does not match the CMS pattern (for example the count of allowed amounts).',
  SCHEMA_ANYOF: 'None of the accepted alternatives is present (for example no dollar, percentage or algorithm charge).',
  SCHEMA_CONST: 'A value must match a fixed CMS text exactly (for example the attestation statement).',
  SCHEMA_ADDITIONALPROPERTIES: 'A field that the CMS schema does not define.',
  VERSION: 'The file declares a version other than CMS 3.0.0.',
  MISSING_HEADER: 'A column required by the CMS tall or wide CSV template is missing.',
  DUPLICATE_HEADER: 'The same CSV column appears twice.',
  HEADER_PLACEHOLDER: 'A CSV header still contains a template placeholder such as [payer_name].',
  ROW_WIDTH: 'A CSV row has a different number of cells than its header.',
  DUPLICATE_KEY: 'The same key appears twice in one JSON object.',
  INVALID_NUMBER: 'A numeric field is malformed, not finite, or not positive.',
  EMPTY_FILE: 'No standard-charge records were found.',
  PARSER_ERROR: 'The file could not be parsed as JSON or CSV.',
  UNSUPPORTED_FORMAT: 'Not a JSON or CSV price file in UTF-8 (for example a PDF, ZIP or HTML page).',
  METADATA_UNSEEN: 'Warning: required metadata was not reached inside the inspected part of the file.',
  SAMPLE_LIMIT: 'Warning: only part of the file was inspected; the rest is not validated.',
  CHECK_LIMIT: 'Warning: the file hit a complexity limit, so inspection stopped early.',
};

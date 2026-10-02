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
}

DEMO_RUNS_PER_DAY = 10

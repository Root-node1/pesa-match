# Import Formats

## Orders CSV

Headers (required: `amountMinor`; others optional):

```
externalReference,customerName,description,amountMinor,currency,orderDate
```

Example:
```
externalReference,customerName,description,amountMinor,currency,orderDate
ORD-1,Acme Ltd,Widget order,1500000,KES,2026-01-01
ORD-2,,Gadget,300000,KES,
```

## Payments CSV

Headers (required: `amountMinor`):

```
externalTransactionReference,amountMinor,currency,paymentDate,paymentMethod,payerReference
```

Example:
```
externalTransactionReference,amountMinor,currency,paymentDate,paymentMethod,payerReference
ORD-1,1000000,KES,2026-01-02,MPESA,ACC1
```

## Rules

- UTF-8, quoted fields supported.
- `amountMinor` must be integer KES minor units (no decimals).
- `currency` must be `KES` if provided.
- Dates ISO-8601 (`YYYY-MM-DD`).
- Max file size 5MB, max 10,000 rows.
- Row-level errors returned in `rejected`.
- Duplicate rows (by fingerprint) are skipped, not rejected.

## Idempotency

- If `externalReference`/`externalTransactionReference` present, fingerprint = `imp:order:ref:<ref>` / `imp:payment:ref:<ref>`.
- Otherwise deterministic SHA-256 fingerprint from normalized fields scoped to organization.
- Re-uploading the same file skips duplicates.

## Formula injection

CSV exports prefix dangerous leading characters (`=`,`+`,`-`,`@`) with `'`.

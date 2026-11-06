# SMS Integration

## Status

Provider abstraction and reliable outbox implemented. ThriveWave live submission is NOT verified because official ThriveWave API documentation/credentials were not available in the repository or environment.

## Provider abstraction

- `SmsProvider` interface (`send`) in `apps/backend/src/sms`.
- `FakeSmsProvider` (dev/test) returns SUBMITTED with `fake-` provider id. Never claims DELIVERED.
- `ThriveWaveSmsProvider` requires `THRIVEWAVE_API_BASE_URL`, `THRIVEWAVE_API_KEY`, `THRIVEWAVE_SENDER_ID`. Even when configured, it throws because the verified HTTP contract is unavailable. Do not enable in production until verified.

Provider selection via `SMS_PROVIDER` env (`auto` default, `fake`, `thrivewave`).

## Outbox

`NotificationOutbox` tracks PENDING/PROCESSING/SUBMITTED/DELIVERED/FAILED. Idempotency key per org. Retries via `POST /notifications/sms/:id/retry`. Processing via `POST /notifications/process` or worker.

## Consent

SMS opt-in required; Kenyan number normalization to +254. Consent timestamps recorded. Withdrawal disables sending.

## Missing for live ThriveWave
- Official API base URL, auth scheme, endpoint, payload/response, webhook signature scheme, delivery receipt format, rate limits, sender ID rules.

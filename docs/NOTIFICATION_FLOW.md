# Notification Flow

1. Reconciliation run completes.
2. If org has SMS enabled + consent + recipient, a `NotificationOutbox` row is created (idempotency key `recon:<org>:<auditEventId>`).
3. Processor (`POST /notifications/process`) picks PENDING, marks PROCESSING, calls provider.
4. On accept -> SUBMITTED (sentAt). On failure -> FAILED with lastError.
5. Retry endpoint re-queues FAILED/PENDING.
6. No DELIVERED claim unless provider confirms delivery (not implemented; ThriveWave webhook contract unverified).

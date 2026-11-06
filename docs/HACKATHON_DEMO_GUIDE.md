# Hackathon Demo Guide

Problem: small Kenyan businesses reconcile M-Pesa payments manually, causing missed/unmatched payments.

Value: deterministic reconciliation + exception management + audit trail.

Demo account: demo@pesamatch.local / DemoPass!2026 (change after event).

3-minute flow:
1. Login.
2. Dashboard summary.
3. Orders and payments lists.
4. Run reconciliation.
5. Exceptions: partial, unmatched, duplicate, suggested.
6. Approve suggested match.
7. Show updated balances.
8. Export CSV.
9. SMS preferences (demo mode).

Architecture: Nuxt (Cloudflare) -> NestJS (RumptyCloud) -> Postgres. SMS outbox with fake provider.

Limitations: no live M-Pesa, no live SMS, no full accounting.

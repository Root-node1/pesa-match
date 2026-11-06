# Matching Rules

## Automatic matches (APPROVED)

Only when:
1. Payment `transactionReference` exactly equals an order's `sourceReference` (external reference), and amounts align (allocate min(available, outstanding)).
2. No other candidate order shares that reference.

## Suggestions (SUGGESTED, requires human review)

- Transaction reference match but order already fully allocated.
- Ambiguous transaction reference (multiple orders).
- Exact outstanding amount equals payment available (single candidate).

## Never automatic

- Similar amounts.
- Similar dates.
- Customer/payer names.
- Partial reference similarity.

## Duplicates

Payments sharing a non-null transaction reference are marked `DUPLICATE_SUSPECTED`. Not deleted.

## Partial payments

Allocations sum per order/payment. Outstanding = total - allocated. Over-allocation rejected at DB/service level.

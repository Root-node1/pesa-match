export interface ApiEnvelope<T> { success: boolean, data: T, statusCode?: number, message?: string, errors?: unknown, timestamp?: string }

export interface User { id: string, email: string, firstName: string | null, lastName: string | null, createdAt: string }
export interface Membership { id: string, role: string, organization: { id: string, name: string, currency: string } }
export interface AuthResponse { accessToken: string, user: User, organizationId: string }
export interface MeResponse { user: User, memberships: Membership[] }

export interface Order {
  id: string; organizationId: string; importBatchId: string | null; sourceReference: string | null
  customerName: string | null; description: string | null; amountMinor: number; currency: string
  orderDate: string | null; status: string; reconciliationStatus: string; createdAt: string; updatedAt: string
  matches?: PaymentMatch[]; allocatedMinor?: number; outstandingMinor?: number
}
export interface Payment {
  id: string; organizationId: string; importBatchId: string | null; sourceReference: string | null
  transactionReference: string | null; amountMinor: number; currency: string; paymentDate: string | null
  status: string; reconciliationStatus: string; createdAt: string; updatedAt: string; matches?: PaymentMatch[]
  allocatedMinor?: number; availableMinor?: number
}
export interface PaymentMatch {
  id: string; organizationId: string; orderId: string; paymentId: string; amountMinor: number
  status: string; isManual: boolean; reason: string | null; createdByUserId: string | null
  reversedAt: string | null; reversedReason: string | null; createdAt: string; updatedAt: string
}
export interface Paginated<T> { items: T[], total: number, page: number, limit: number, totalPages: number }

export interface ImportBatch {
  id: string; organizationId: string; type: string; sourceName: string | null; status: string
  totalRows: number; importedRows: number; failedRows: number; errorSummary: any; createdAt: string
}
export interface ImportResult {
  batchId: string; totalRows: number; importedRows: number; rejectedRows: number; duplicateRows: number; rejected: { row: number, reason: string }[]
}

export interface ReconciliationSummary {
  currency: string; totalOrderValueMinor: number; totalPaymentValueMinor: number
  totalAllocatedMinor: number; outstandingBalanceMinor: number
  orders: { total: number, fullyPaid: number, partiallyPaid: number, unmatched: number, reviewRequired: number }
  payments: { total: number, fullyAllocated: number, partiallyAllocated: number, unmatched: number, reviewRequired: number, suspectedDuplicates: number }
  reviewRequiredRecords: number; suspectedDuplicates: number
}
export interface ReconciliationExceptions {
  orders: Order[]; payments: Payment[]; suggestedMatches: PaymentMatch[]
}
export interface Health { status: string, database: string, timestamp: string }

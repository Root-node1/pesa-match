-- AlterTable
ALTER TABLE "PaymentMatch" ADD COLUMN     "runId" TEXT;

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "scope" TEXT NOT NULL DEFAULT 'ALL_IMPORTED',
    "expectedOrderValueMinor" BIGINT NOT NULL DEFAULT 0,
    "receivedPaymentValueMinor" BIGINT NOT NULL DEFAULT 0,
    "matchedValueMinor" BIGINT NOT NULL DEFAULT 0,
    "outstandingValueMinor" BIGINT NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "orderId" TEXT,
    "paymentId" TEXT,
    "importBatchId" TEXT,
    "importRowNumber" INTEGER,
    "expectedMinor" BIGINT,
    "actualMinor" BIGINT,
    "differenceMinor" BIGINT,
    "description" TEXT,
    "resolution" TEXT,
    "resolutionReason" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationRun_organizationId_idx" ON "ReconciliationRun"("organizationId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_organizationId_status_idx" ON "ReconciliationRun"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationException_organizationId_idx" ON "ReconciliationException"("organizationId");

-- CreateIndex
CREATE INDEX "ReconciliationException_organizationId_status_idx" ON "ReconciliationException"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationException_organizationId_type_idx" ON "ReconciliationException"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationException_organizationId_runId_type_orderId_p_key" ON "ReconciliationException"("organizationId", "runId", "type", "orderId", "paymentId");

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

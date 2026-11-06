-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "smsConsentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "smsConsentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN     "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsRecipient" TEXT;

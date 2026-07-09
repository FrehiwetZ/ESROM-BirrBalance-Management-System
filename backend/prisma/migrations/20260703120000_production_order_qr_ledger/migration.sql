CREATE TYPE "transaction_direction" AS ENUM ('credit', 'debit');

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'order_status';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'refund';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'feedback';

ALTER TABLE "balance_transactions"
  ADD COLUMN "direction" "transaction_direction";

UPDATE "balance_transactions"
SET "direction" = CASE
  WHEN "transaction_type"::text IN ('order', 'expiration') THEN 'debit'::"transaction_direction"
  WHEN "transaction_type"::text = 'adjustment' AND "amount" < 0 THEN 'debit'::"transaction_direction"
  ELSE 'credit'::"transaction_direction"
END;

UPDATE "balance_transactions"
SET "amount" = ABS("amount")
WHERE "amount" < 0;

ALTER TABLE "balance_transactions"
  ALTER COLUMN "direction" SET NOT NULL,
  ALTER COLUMN "direction" SET DEFAULT 'credit';

ALTER TABLE "balance_transactions"
  ADD CONSTRAINT "balance_transactions_amount_positive_check" CHECK ("amount" > 0);

CREATE INDEX "idx_balance_transactions_user_direction_created_at"
  ON "balance_transactions"("user_id", "direction", "created_at");

CREATE TABLE "qr_sessions" (
  "id" SERIAL PRIMARY KEY,
  "session_hash" VARCHAR(64) NOT NULL UNIQUE,
  "employee_id" INTEGER NOT NULL,
  "waiter_id" INTEGER NOT NULL,
  "cafe_id" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "used_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "qr_sessions_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "qr_sessions_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_qr_sessions_employee_expires"
  ON "qr_sessions"("employee_id", "expires_at");

CREATE INDEX "idx_qr_sessions_waiter_expires"
  ON "qr_sessions"("waiter_id", "expires_at");

CREATE INDEX "idx_qr_sessions_used_expires"
  ON "qr_sessions"("used_at", "expires_at");

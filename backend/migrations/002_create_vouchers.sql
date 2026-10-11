-- Voucher records, numbering, payment status, and indexes.
CREATE TYPE voucher_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(30) NOT NULL UNIQUE DEFAULT (
    'EV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('voucher_number_seq')::text, 5, '0')
  ),
  voucher_date DATE NOT NULL,
  expense_date DATE NOT NULL,
  department VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  employee_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  employee_signature TEXT,
  status voucher_status NOT NULL DEFAULT 'DRAFT',
  director_signature TEXT,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vouchers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE vouchers
  ADD CONSTRAINT chk_voucher_status CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'));

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at
BEFORE UPDATE ON vouchers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX IF NOT EXISTS idx_vouchers_expense_date ON vouchers(expense_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at);

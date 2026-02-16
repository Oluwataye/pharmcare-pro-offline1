
USE pharmcare_offline;

CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  closing_balance DECIMAL(15, 2) NULL,
  total_sales DECIMAL(15, 2) DEFAULT 0.00,
  total_expenses DECIMAL(15, 2) DEFAULT 0.00,
  expected_cash DECIMAL(15, 2) DEFAULT 0.00,
  actual_cash DECIMAL(15, 2) NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id VARCHAR(36) PRIMARY KEY,
  shift_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  reconciled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expected_amount DECIMAL(15, 2) NOT NULL,
  actual_amount DECIMAL(15, 2) NOT NULL,
  difference DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending',
  notes TEXT,
  verified_by VARCHAR(36),
  verified_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

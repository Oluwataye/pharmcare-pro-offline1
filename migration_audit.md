# Controlled Parity Migration: Audit Report

## 🔍 Phase 1: Online Module Map (pharmcare-pro1-main)

### Core Routes & Pages
- **Financials**: `/shifts`, `/expenses`, `/cash-reconciliation`, `/credit`
- **POS**: `/sales`, `/sales/new`, `/sales/receipts`, `/sales/history`
- **Inventory**: `/inventory`, `/suppliers`
- **Admin**: `/users`, `/settings`, `/analytics`, `/reports/*`
- **Help**: `/training`, `/technical-guide`

### Feature Components
- `shifts/`: Shift management and handover logic.
- `expenses/`: Expense tracking and categorization.
- `reports/`: 21+ specialized reporting sub-components.
- `sync/`: Sophisticated conflict resolution for offline-to-cloud mapping.

---

## 🔍 Phase 2: Offline Gap Matrix

| Online Module | Offline Exists | Status | Adaptation Notes |
| :--- | :--- | :--- | :--- |
| **POS & Sales** | Yes | ✅ Integrated | Path consistency needs small fixes. |
| **Inventory** | Yes | ✅ Integrated | Basic parity, verify FEFO logic. |
| **Shift Management** | **No** | ❌ **MISSING** | Needs local DB table + Express routes. |
| **Expense Tracking** | **No** | ❌ **MISSING** | Needs local DB table + Express routes. |
| **Cash Reconciliation**| **No** | ❌ **MISSING** | High priority for financial integrity. |
| **Credit Management** | **No** | ❌ **MISSING** | Critical for customer debt tracking. |
| **Reports** | Partial | ⚠️ Limited | Need to port advanced SQL aggregations. |
| **Analytics** | Partial | ⚠️ Limited | Need to port dashboard metric widgets. |
| **Settings** | Yes | ✅ Integrated | Standardize with online features. |

---

## ⚙️ Phase 3: Migration & Adaptation Strategy

### 1. Data Layer Adaptation
- **Supabase RPC/Queries** → Replaced with **Express API + Local MySQL**.
- **Auth User Context** → Replaced with **Local JWT Auth context**.
- **Real-time Subscriptions** → Replaced with **Polling or manual refresh**.

### 2. Business Logic Preservation
- All financial aggregation logic (VAT, Discount, Profit) will be ported as-is to ensure mathematical parity between versions.

### 3. Implementation Sequence
1.  **Core Financials**: Shifts, Reconciliation, Expenses.
2.  **Advanced Reports**: P&L, Stock Value, Sales Trends.
3.  **Secondary Admin**: Credit Management & Training docs.

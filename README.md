# TransitOps 🚚💨
> Smart Transport Operations Platform. Designed for modern logistics fleet tracking, compliance audit, and financial analytics. Built for the Hackathon.

TransitOps replaces complex, error-prone spreadsheets with a real-time, consolidated dashboard that unites Fleet Managers, Dispatchers, Safety Officers, and Financial Analysts. It prevents resource double-booking, flags vehicle load capacities, audits license expiration dates, and calculates ROI utilizing a customized mathematical formula.

---

## 🛠️ Tech Stack
*   **Framework**: Next.js 16 App Router (with Turbopack support)
*   **Database ORM**: Prisma 7 (connected to PostgreSQL)
*   **Security & Auth**: Role-Based Access Control (RBAC) powered by `iron-session`
*   **Analytics Visualization**: Recharts (fully dynamic dashboard plotting)
*   **Styling**: Vanilla CSS custom themes & layout overrides for a premium dark/light layout interface.
*   **Linter/Formatter**: ESLint & TypeScript static compilation rules.

---

## ✨ Key Features

### 1. Operations Control Center (Proactive Risk Alerting)
*   Scans database tables dynamically to calculate operational risks.
*   **Critical Alerts**: Blocks dispatching of expired licenses, suspended drivers, or invalid dispatch mappings.
*   **Warning Alerts**: Identifies vehicles with negative ROI, long-running active maintenance orders (> 3 days), or licenses expiring in under 30 days.
*   **Info Alerts**: Lists dispatch-ready fleet capacity and target utilization rates.
*   Provides instant action routes directly to resolution pages.

### 2. Smart Dispatch Engine
*   Analyzes vehicle options dynamically and recommends the best fit using a weighted algorithm:
    *   **Cargo Capacity Match**: 35%
    *   **Fuel Efficiency Rating**: 30%
    *   **Maintenance Status & History**: 20%
    *   **Availability Timeline**: 15%
*   Provides automated warnings for overload conditions (e.g. 500kg cargo load assigned to `Tata Ace Van-05` which has a 500kg limit; cargo weight > 500kg is rejected).

### 3. Financial Analytics & Audited ROI Tracking
*   Calculates per-vehicle Return on Investment (ROI) using the audited centralized formula:
    $$\text{Vehicle ROI} = \frac{\text{Completed Trip Revenue} - (\text{Maintenance Cost} + \text{Fuel Cost})}{\text{Acquisition Cost}} \times 100$$
*   Gracefully handles zero-acquisition costs to prevent division-by-zero errors.
*   Shows charts plotting monthly revenue vs. fuel costs, vehicle status breakdowns, and top cost-incurring assets.

### 4. Safety & Compliance Portal
*   Monitors license status (Valid, Expiring Soon, Expired).
*   Enforces chronological sorting of compliance issues so Safety Officers address critical risks first.
*   Tracks individual safety scores and total trip completion percentages.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install all node modules:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (Note: `.env` is ignored by Git to secure secrets) and populate it:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/transitops"
SESSION_SECRET="transitops-secret-secure-random-key"
```

### 3. Database Migration & Seed
Run Prisma migrations and initialize seed database data:
```bash
npx prisma db push
npx prisma db seed
```
*(The seed data includes Tata Ace Van-05, complete trips, fuel logs, and maintenance records).*

### 4. Running Locally
Launch the local development environment:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

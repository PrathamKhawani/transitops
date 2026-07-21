# TransitOps 🚚💨

> Smart Transport Operations Platform. Designed for modern logistics fleet tracking, compliance audit, and financial analytics.

**🌐 Live Demo: [https://transitops-murex-gamma.vercel.app](https://transitops-murex-gamma.vercel.app)**

TransitOps replaces complex, error-prone spreadsheets with a real-time, consolidated dashboard that unites Fleet Managers, Dispatchers, Safety Officers, and Financial Analysts. It prevents resource double-booking, flags vehicle load capacities, audits license expiration dates, and calculates ROI utilizing a customized mathematical formula.

---

## 🛠️ Tech Stack
*   **Framework**: Next.js 15 App Router (with Turbopack support)
*   **Database ORM**: Prisma 7 (connected to PostgreSQL)
*   **Security & Auth**: Role-Based Access Control (RBAC) powered by `iron-session`
*   **Analytics Visualization**: Recharts (fully dynamic dashboard plotting)
*   **Styling**: Vanilla CSS custom themes & layout overrides for a premium dark/light layout interface.
*   **Deployment**: Vercel (serverless), Neon PostgreSQL (cloud DB)
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
*   Provides automated warnings for overload conditions.

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

## 🔑 Demo Credentials

To test the role-based access control matrix, log in with any of the following seeded user profiles. Use the universal password: **`demo1234`**

| Operational Role | Email Address | Assigned Name | Primary Dashboard Views |
| :--- | :--- | :--- | :--- |
| **Fleet Manager** | `fleet@transitops.in` | Pratham Khawani | Fleet Dashboard, Vehicle & Driver Roster, Role Approvals |
| **Dispatcher** | `dispatch@transitops.in` | Priya Sharma | Smart Dispatch Command, Route Operations, Trip Creation |
| **Safety Officer** | `safety@transitops.in` | Rajesh Patel | Safety Overview, Driver Status, Compliance Audit Roster |
| **Financial Analyst** | `finance@transitops.in` | Kavya Desai | Finance Overview, Cost Breakdown, Revenue Charts |

---

## 🚀 Getting Started (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/PrathamKhawani/transitops.git
cd transitops
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and populate it:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/transitops"
SESSION_SECRET="your-secret-random-key-at-least-32-chars"
```

### 3. Database Migration & Seed
```bash
npx prisma db push
npx prisma db seed
```
*(The seed data includes seeded users, vehicles, trips, fuel logs, and maintenance records.)*

### 4. Run Locally
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Deployment (Vercel + Neon PostgreSQL)

TransitOps is deployed on **Vercel** with **Neon** as the cloud PostgreSQL provider.

### Steps to Deploy Your Own Instance

1. **Create a Neon database** at [neon.tech](https://neon.tech) (free tier available).
2. **Fork/clone this repo** and push to your GitHub.
3. **Import project to Vercel** and connect your GitHub repo.
4. **Set Environment Variables** in Vercel → Project → Settings → Environment Variables:
   - `DATABASE_URL` — your Neon connection string (e.g. `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
   - `SESSION_SECRET` — a secure random 32+ character string
5. **Run migrations on Neon** using `npx prisma db push` with your Neon `DATABASE_URL` set locally.
6. **Seed the database** with `npm run db:seed` (after pointing `DATABASE_URL` to Neon).
7. Vercel will auto-deploy on every push to `main`.

> **Note**: The `127.0.0.1` local PostgreSQL URL in `.env` only works for local development. Vercel requires a cloud database URL.

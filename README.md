# Expense Voucher Management System

A full-stack web application that digitizes the expense voucher process: employees create and submit vouchers, the Director approves or rejects them, and the Accounts Team monitors approved vouchers for reimbursement.

Built as the Full Stack Developer Internship assignment for Prachay Group.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios, React Hook Form + Zod, react-hot-toast, Lucide icons |
| Backend | Node.js, Express.js, JWT authentication, bcrypt, Multer (file upload), Zod validation, Helmet, CORS, Morgan |
| Database | PostgreSQL (plain SQL migrations, `pg` library, no ORM) |

## Features

- JWT login with role-based access control (Employee, Director, Accounts)
- Protected routes on the frontend and role checks on every backend route
- Employees: create, save as draft, edit, delete drafts, upload signature, submit, track status, see rejection reasons
- Director: dashboard, pending approvals, all vouchers, approve (signature required), reject (reason required)
- Accounts: read-only view of all vouchers, signatures, approval status, print voucher
- Search, filter and sort by voucher number, employee name, department, category, status, date range and amount range, with pagination
- Role-specific dashboards
- Automatic unique voucher numbers (`EV-YYYY-00001`)
- Image upload for employee and director signatures (JPG/PNG, max 2 MB)

## Project Structure

```
expense-voucher-system/
├── backend/
│   ├── migrations/            SQL schema files (001, 002, 003)
│   ├── scripts/               run-migrations.js, seed.js
│   ├── src/
│   │   ├── controllers/       auth, user, voucher, dashboard
│   │   ├── middleware/        authMiddleware (JWT + roles), errorMiddleware
│   │   ├── routes/            auth, user, voucher, dashboard
│   │   ├── services/          business logic and SQL queries
│   │   ├── utils/             AppError, upload (Multer)
│   │   └── validators/        Zod schemas
│   ├── app.js
│   ├── server.js
│   ├── db.js
│   ├── voucher-test-script.js API smoke test for the voucher workflow
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/        AppLayout, ProtectedRoute, ui
│       ├── context/           AuthContext
│       ├── lib/               api (Axios instance), formatters
│       └── pages/             Login, Dashboard, VoucherList, VoucherForm, VoucherDetail
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 13 or higher
- npm

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd expense-voucher-system
```

### 2. Create the database

Using pgAdmin, or:

```bash
psql -U postgres -c "CREATE DATABASE expense_voucher;"
```

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env        # on Windows: copy .env.example .env
```

Edit `backend/.env` and fill in your database password and a long random `JWT_SECRET`.

Run the migrations and seed the demo users:

```bash
npm run migrate
npm run seed
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health`.

> Warning: `npm run seed` deletes all existing vouchers and users before inserting the demo users. Do not run it on a database that holds data you want to keep.

### 4. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

The frontend calls `/api` and `/uploads`, which the Vite dev server proxies to `http://localhost:5000` (see `vite.config.js`). To point at a different backend, create `frontend/.env` with:

```
VITE_API_URL=http://localhost:5000/api
```

### Environment variables (`backend/.env.example`)

| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Optional single connection string. If set, it is used instead of the DB_* variables |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection settings |
| `DB_SSL` | `true` for hosted databases that require SSL |
| `JWT_SECRET` | Secret used to sign tokens. Use a long random string |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Frontend origin allowed by CORS, e.g. `http://localhost:5173` |

## Demo Accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Director | director@company.com | Director@123 |
| Accounts | accounts@company.com | Accounts@123 |
| Employee | employee1@company.com | Employee1@123 |
| Employee | employee2@company.com | Employee2@123 |

## Voucher Workflow

```
            Employee creates
                  │
                  ▼
               DRAFT  ◄──── editable / deletable by the employee
                  │  Submit (employee signature required)
                  ▼
          PENDING_APPROVAL  ◄──── read-only for the employee
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    APPROVED             REJECTED
 (director signature   (rejection reason
     required)           required)
        │                   │
        ▼                   ▼
 Visible to Accounts   Employee can view
 for reimbursement     the rejection reason
```

## Database Schema

Migrations are in `backend/migrations/` and run in order by `npm run migrate`.

### `users` (001, 003)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| full_name | VARCHAR(100) | required |
| email | VARCHAR(150) | required, unique |
| password_hash | TEXT | bcrypt hash |
| role | ENUM `user_role` | `employee`, `director`, `accounts` |
| department | VARCHAR(100) | default `General` |
| signature_path | TEXT | saved signature image path (added in 003) |
| created_at, updated_at | TIMESTAMPTZ | `updated_at` maintained by a trigger |

### `vouchers` (002)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| voucher_number | VARCHAR(30) | unique, auto-generated as `EV-<year>-<5-digit sequence>` from `voucher_number_seq` |
| voucher_date | DATE | required |
| expense_date | DATE | required |
| department | VARCHAR(100) | required |
| title | VARCHAR(200) | required |
| category | VARCHAR(100) | required |
| description | TEXT | required |
| amount | NUMERIC(12,2) | `CHECK (amount > 0)` |
| employee_name | VARCHAR(100) | taken from the logged-in user |
| employee_id | VARCHAR(50) | optional |
| employee_signature | TEXT | image path, mandatory before submission |
| status | ENUM `voucher_status` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` (default `DRAFT`) |
| director_signature | TEXT | image path, mandatory before approval |
| approval_date | TIMESTAMPTZ | set on approval |
| rejection_reason | TEXT | mandatory on rejection |
| created_by | INTEGER FK | references `users(id)`, `ON DELETE CASCADE` |
| created_at, updated_at | TIMESTAMPTZ | `updated_at` maintained by a trigger |

Indexes: `status`, `created_by`, `expense_date`, `created_at` on vouchers; `role`, `email`, `signature_path` on users.

## API Documentation

Base URL: `http://localhost:5000/api`

All endpoints except login and health require the header `Authorization: Bearer <token>`.

Errors are returned as JSON with an appropriate status code and a `message` field, for example:

```json
{ "success": false, "message": "Rejection reason is required." }
```

Common status codes: `400` validation error, `401` missing or invalid token, `403` role not allowed or voucher not owned by the user, `404` not found.

### Health

| Method | URL | Access |
|---|---|---|
| GET | `/health` | Public |

### Auth

| Method | URL | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Body: `{ "email", "password" }`. Returns a JWT token and the user |
| GET | `/auth/me` | Any logged-in user | Returns the current user |

### Users

| Method | URL | Access | Description |
|---|---|---|---|
| POST | `/users/signature` | Any logged-in user | `multipart/form-data`, file field `signature` (JPG/PNG, max 2 MB). Saves the signature to `/uploads` and stores its path in `users.signature_path` |

### Vouchers

| Method | URL | Access | Description |
|---|---|---|---|
| POST | `/vouchers` | Employee | Create a voucher. Always starts as `DRAFT` |
| GET | `/vouchers` | Any role | List vouchers. Employees get only their own. Director and Accounts get all. Supports query params below |
| GET | `/vouchers/:id` | Any role | Voucher details. Employees can open only their own |
| PUT | `/vouchers/:id` | Employee (owner) | Update a voucher, only while `DRAFT` |
| DELETE | `/vouchers/:id` | Employee (owner) | Delete a voucher, only while `DRAFT` |
| POST | `/vouchers/:id/submit` | Employee (owner) | `multipart/form-data`, optional file field `employee_signature`. Requires a signature (uploaded now or saved on the profile). Status becomes `PENDING_APPROVAL` |
| POST | `/vouchers/:id/approve` | Director | `multipart/form-data`, optional file field `director_signature`. Requires a signature (uploaded now or saved on the profile). Status becomes `APPROVED` and `approval_date` is set |
| POST | `/vouchers/:id/reject` | Director | JSON body `{ "rejection_reason": "..." }` (required). Status becomes `REJECTED` |

Example create body:

```json
{
  "voucher_date": "2026-10-12",
  "expense_date": "2026-10-10",
  "department": "Operations",
  "title": "Client visit travel",
  "category": "Travel",
  "description": "Taxi and train fare for the client visit in Mumbai",
  "amount": 2450.50
}
```

Validation rules: department, title and expense date are required; amount must be greater than zero.

#### Query parameters for `GET /vouchers`

| Param | Description |
|---|---|
| `search` | Matches voucher number or employee name (case-insensitive) |
| `status` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED` or `REJECTED` |
| `department`, `category` | Filter by department or category |
| `fromDate`, `toDate` | Expense date range |
| `minAmount`, `maxAmount` | Amount range |
| `sortBy` | `created_at`, `amount`, `expense_date` or `status` (whitelisted) |
| `order` | `asc` or `desc` |
| `page`, `limit` | Pagination |

Response:

```json
{ "data": [ /* vouchers */ ], "total": 42, "page": 1, "totalPages": 6 }
```

### Dashboard

| Method | URL | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | Any role | Returns stats based on the caller's role |

- Employee: `total`, `draft`, `pending`, `approved`, `rejected`, `total_amount_claimed` (own vouchers only)
- Director: `pending_count`, `approved_today`, `rejected_today`, `total_pending_amount`, `recent_activities`
- Accounts: `total`, `pending`, `approved`, `rejected`, `total_approved_amount`, `recent_approved_vouchers`

## Business Rules Implemented

1. Every voucher has a unique, automatically generated voucher number.
2. Every new voucher is saved as `DRAFT`.
3. Employees can edit or delete a voucher only while it is `DRAFT`.
4. Once submitted, a voucher is read-only for the employee.
5. Only the Director can approve or reject submitted vouchers.
6. Approved and rejected vouchers are read-only.
7. A rejection reason is mandatory when rejecting.
8. The employee signature is mandatory before submission and the Director signature is mandatory before approval.
9. Employees can view only their own vouchers. The Director and the Accounts Team can view all vouchers.
10. The Accounts Team has read-only access: no create, edit, delete, approve or reject.

All rules are enforced on the backend, not only in the UI.

## Assumptions

- "Submitted" and "Pending Approval" are treated as a single status, `PENDING_APPROVAL`, because the vouchers move directly into the Director's queue on submission.
- Users are created by the seed script. There is no self-registration, since this is an internal company tool.
- Signature images are stored on the server's local disk (`backend/uploads`) and only the file path is saved in the database. A production deployment would use object storage such as AWS S3.
- A user can save a signature to their profile and reuse it when submitting or approving.
- The voucher number sequence is global and does not reset each year, so numbers stay unique.
- The Director can see all vouchers, including drafts, as the assignment requires viewing every voucher in the system.
- Amounts are displayed in a single currency.

## Testing

`backend/voucher-test-script.js` is a smoke test that exercises the main workflow against a running server: create, validation failures, submit without a signature, submit with a signature, edit after submission (blocked), reject without a reason, approve with a signature, and the Accounts role being blocked from creating vouchers. Start the backend, then run:

```bash
cd backend
node voucher-test-script.js
```

## Security Notes

- Passwords are hashed with bcrypt. JWTs are signed with a secret from the environment.
- All SQL uses parameterized queries, and sortable columns are whitelisted.
- Uploads are restricted to JPG/PNG and 2 MB.
- Helmet and CORS (restricted to `CLIENT_URL`) are enabled.
- `.env` is excluded from version control. Only `.env.example` is committed.
```

## Future Improvements

- Store signatures in AWS S3 and deploy the app on EC2
- Receipt or bill attachments on vouchers
- Email notifications on submission, approval and rejection
- Export vouchers as PDF or CSV
- Payment status tracking for the Accounts Team
- Automated unit and integration tests, plus Docker Compose for one-command setup

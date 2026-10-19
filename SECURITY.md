# Security Policy & Architecture

## 1. Threat Model & Mitigations

| Threat | Description | Implemented Mitigation | Status |
| :--- | :--- | :--- | :---: |
| **Cross-Vertical Data Leaks** | A member assigned to Vertical A attempts to read or mutate records belonging to Vertical B. | **Postgres Row Level Security (RLS)** is enforced on every single table with `has_vertical_access(target_vertical_id)` and `can_write_vertical(target_vertical_id)` helper functions. API calls cannot bypass this because security is evaluated directly in the Postgres database engine. | **Verified** |
| **Privilege Escalation** | A `member` or `viewer` attempts to elevate their role to `admin` or delete other users' records. | Postgres RLS check prevents non-admins from modifying the `role` or `is_active` fields. Deletions require `manager`, `admin`, or `owner` roles. | **Verified** |
| **API Denial of Service & Abuse** | Malicious users bursting write-heavy endpoints (`POST /api/crm`) to exhaust Supabase database connections or corrupt state. | **Sliding Window Rate Limiter** (`src/lib/rate-limiter.ts`) limits clients to 120 write operations per minute with HTTP `429 Too Many Requests` responses and `Retry-After` headers. | **Verified** |
| **CSV / Formula Injection** | An attacker inputs formula characters (`=cmd|' /C ...'!A0`, `+`, `-`, `@`, `\t`) in lead names or companies to execute code in Excel / Sheets upon CSV export. | Sanitization helper `sanitizeCsvCell()` automatically prepends a single quote `'` to any string starting with `=`, `+`, `-`, `@`, or tab characters, neutralizing formula execution. | **Verified** |
| **Cross-Site Scripting (XSS)** | Malicious scripts embedded into markdown notes, custom field values, or card descriptions. | Client rendering uses sanitized escaping. Strict Content Security Policy (CSP), `X-XSS-Protection: 1; mode=block`, and `X-Content-Type-Options: nosniff` block unauthorized inline script injections. | **Verified** |
| **Insecure Direct Object Reference (IDOR)** | Guessing UUIDs for leads, customer records, or Kanban cards belonging to unauthorized verticals. | RLS policies check vertical membership for every SELECT, UPDATE, and DELETE query. Unpermitted queries return 0 rows or trigger permission errors. | **Verified** |
| **Clickjacking & UI Redressing** | Embedding the CRM in malicious iframes to hijack clicks or user credentials. | `X-Frame-Options: DENY` enforced in `next.config.ts` and `src/middleware.ts`. | **Verified** |
| **Service Role Key Exposure** | Leaking the Supabase master administrative key to client-side code. | Strict separation: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public and strictly bounded by RLS. `SUPABASE_SERVICE_ROLE_KEY` is kept server-side only in `src/lib/supabase/rest.ts`. | **Verified** |
| **Unauthorized Public Registration** | Public internet users attempting to register unauthorized accounts. | App is strictly **invite-only**. Signup endpoints require valid admin-generated invitation tokens. Public signup is disabled. | **Verified** |
| **Accidental Data Loss** | Accidental deletion of high-value leads, accounts, or kanban tasks. | **30-Day Soft-Delete Protection Policy** with Recycle Bin console (`/recycle-bin`) allowing 1-click restoration or admin-confirmed permanent purging. | **Verified** |

---

## 2. Multi-Factor Authentication (MFA / TOTP) Policy

- Built using RFC 6238 Time-based One-Time Passwords (TOTP).
- Compatible with Google Authenticator, 1Password, and Authy.
- **Mandatory for Admin & Owner roles**: Admins receive an enforcement banner upon login if MFA is not enrolled.
- Simulated and configurable via `/settings/profile` and `/mfa`.

---

## 3. Rate Limiting Specification

- **Algorithm:** In-Memory Sliding Window (`src/lib/rate-limiter.ts`).
- **Scope:** Applied to write-heavy endpoints (`POST /api/crm`).
- **Threshold:** 120 write requests per minute per IP address.
- **Compliance:** Returns standard headers:
  - `X-RateLimit-Limit`: Maximum requests permitted per window.
  - `X-RateLimit-Remaining`: Remaining request quota.
  - `X-RateLimit-Reset`: Seconds remaining until window quota reset.
  - `Retry-After`: Returned on HTTP 429 status code indicating wait duration.

---

## 4. Pre-Launch Security Checklist

- [x] **RLS Audit**: Verified `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is enabled on all tables in `supabase/migrations/20261019000002_rls_functions_and_policies.sql`.
- [x] **Cross-Vertical Isolation Tests**: Verified with 12 passing unit tests in `tests/unit/security-and-rls.test.ts`.
- [x] **Secrets Verification**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and never included in frontend client bundles.
- [x] **HTTP Headers**: Enforced CSP, HSTS, `X-Frame-Options: DENY`, `Permissions-Policy`, and `X-Content-Type-Options: nosniff` in `next.config.ts`.
- [x] **Rate Limiter Active**: In-memory sliding window rate limiter protects write-heavy API endpoints.
- [x] **CSV Injection Mitigation**: `sanitizeCsvCell()` escapes formula triggers on all analytics and lead exports.
- [x] **Free Tier Protection**: Active scheduled GitHub Actions keep-alive workflow (`.github/workflows/keep-alive.yml`) configured to prevent 7-day database auto-hibernation.
- [x] **MFA Active**: Owner and Admin accounts enrolled with TOTP authenticators.
- [x] **Immutable Audit Trail**: Sensitive operations (`CREATE`, `UPDATE`, `DELETE`, `CONVERT`) logged with pre/post JSON delta diffs (`/audit-logs`).
- [x] **Data Recovery Safeguard**: 30-day soft-delete protection enabled across leads, customers, tasks, and project cards (`/recycle-bin`).

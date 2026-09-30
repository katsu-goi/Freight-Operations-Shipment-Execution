# RBAC — Airship Express FOSE (Authorized Drop-Off Hub)

Four layers: **Auth session → nav visibility → `requireRole`/`requirePermission` → Postgres RLS**.

## Roles (canonical)

| Role | Purpose |
|------|---------|
| **SuperAdmin** | Full system access + user/role management (`users.manage`). Inherits every Admin power. Provisioned via SQL/invite only — never self-registers. |
| **Admin** | Full ops: parcels, manifests, handovers, reports, analytics, AI training, hubs, settings, audit. |
| **Seller** | Business sender ("other user" type): creates own parcels, views own parcels. |
| **Customer** | Recipient: views/tracks own parcels only. |
| **Citizen** | Public/citizen portal: same data tier as Customer (own shipments only). Accepts aliases `user`, `other user`. |

## Lifecycle owner (maker–checker)

- **Manifest batching:** staff (SuperAdmin/Admin) create Draft manifests on `/manifest`
- **Handover sign-off:** staff finalize a Ready manifest to a rider on `/handover`
  (guard: `canFinalizeHandover` → staff only)

## Module matrix

| Module | SuperAdmin | Admin | Seller | Customer | Citizen |
|--------|:----------:|:-----:|:------:|:--------:|:-------:|
| Dashboard | ✓ | ✓ | scoped | scoped | scoped |
| Pickup & Intake | ✓ | ✓ | — | — | — |
| Booking | ✓ | ✓ | own | — | — |
| Manifest & Consolidation | ✓ | ✓ | — | — | — |
| Carrier Handover | ✓ | ✓ | — | — | — |
| Waybill | ✓ | ✓ | — | — | — |
| Reports / Analytics | ✓ | ✓ | — | — | — |
| Train your AI (`/ai/training`) | ✓ | ✓ | — | — | — |
| Sellers / Customers / Hubs | ✓ | ✓ | — | — | — |
| Audit Logs / Settings | ✓ | ✓ | — | — | — |
| User & role management | ✓ | — | — | — | — |

Helpers in SQL: `is_staff()` (= SuperAdmin/Admin), `is_ops()`, `is_superadmin()`, `is_admin_or_above()`, `can_approve_load_plans()`.
App helpers in `src/lib/rbac.ts`: `can()`, `isSuperAdminRole()`, `isCitizenRole()`, `isPublicUserRole()`.
First SuperAdmin bootstrap (run in Supabase SQL Editor after creating the auth user):
```sql
update public.profiles set role = 'SuperAdmin'
where email = 'owner@your-domain.com';
```
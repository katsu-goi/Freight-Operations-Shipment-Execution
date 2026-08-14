# RBAC — Airship Express FOSE (Authorized Drop-Off Hub)

Four layers: **Auth session → nav visibility → `requireRole` → Postgres RLS**.

## Roles

| Role | Purpose |
|------|---------|
| **Admin** | Full ops + schema + approvals |
| **Dispatcher** | Ops writes + handover/manifest approvals |
| **Planner** | Ops visibility; plan intake, batch, and handover |
| **Carrier** | Read-only handover sign-off visibility |
| **Client** | Dashboard scope only (no hub ops) |

## Lifecycle owner (maker–checker)

- **Manifest batching:** ops (Dispatcher/Planner) create Draft manifests on `/manifest`
- **Handover sign-off:** Admin/Dispatcher finalize a Ready manifest to a rider on `/handover`
  (guard: `canFinalizeHandover` → staff only)

## Module matrix

| Module | Admin | Dispatcher | Planner | Carrier | Client |
|--------|:-----:|:----------:|:-------:|:-------:|:------:|
| Dashboard | ✓ | ✓ | ✓ | scoped | scoped |
| Pickup & Intake | ✓ | ✓ | ✓ | — | — |
| Booking | ✓ | ✓ | ✓ | — | — |
| Manifest & Consolidation | ✓ | ✓ | ✓ | — | — |
| Carrier Handover | ✓ | ✓ | ✓ | view | — |
| Waybill | write | write | read | — | — |
| Schema | ✓ | — | — | — | — |

Helpers in SQL: `is_staff()`, `is_ops()`, `can_approve_load_plans()` (legacy load plans).
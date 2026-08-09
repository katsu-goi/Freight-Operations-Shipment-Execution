# RBAC — Airship Express FOSE

Four layers: **Auth session → nav visibility → `requireRole` → Postgres RLS**.

## Roles

| Role | Purpose |
|------|---------|
| **Admin** | Full ops + schema + approvals |
| **Dispatcher** | Ops writes + load-plan approvals |
| **Planner** | Ops visibility; **draft** ML load plans only |
| **Carrier** | Assigned shipments + live tracking posts |
| **Client** | Own shipments / POs |

## Maker–checker (load allocation)

- **Maker (Planner / ops):** generate Draft plans on `/load-allocation`
- **Checker (Admin / Dispatcher):** Approve or Reject Draft only

## Module matrix

| Module | Admin | Dispatcher | Planner | Carrier | Client |
|--------|:-----:|:----------:|:-------:|:-------:|:------:|
| Dashboard | ✓ | ✓ | ✓ | scoped | scoped |
| Booking | ✓ | ✓ | ✓ | — | — |
| Consolidation | ✓ | ✓ | view | — | — |
| ML Load Allocation | approve | approve | draft | — | — |
| BoL | write | write | read | — | — |
| Tracking | ✓ | ✓ | read | own | own |
| PO | ✓ | ✓ | read | — | own |
| Schema | ✓ | — | — | — | — |

Helpers in SQL: `is_staff()`, `is_ops()`, `can_approve_load_plans()`.

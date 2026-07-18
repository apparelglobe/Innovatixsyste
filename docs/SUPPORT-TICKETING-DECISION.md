# Support / ticketing — V1 decision

**Decision: DEFER a dedicated ticketing module for V1. Support is covered by
existing channels.** Documented here per the launch-readiness review.

## Why deferral is the right call for V1

Innovatix V1 is a **delivery platform for a professional-services business** — a
small number of active client engagements, each with a named delivery team — not
a high-volume SaaS product with thousands of anonymous users filing tickets. The
support surface V1 actually needs is already built:

| Support need | Covered by (shipped) |
|---|---|
| Client asks the team a question | **Portal messaging** — `POST /portal/messages`, threaded per project, with `CLIENT`/`TEAM` author roles; staff reply from the admin project view |
| Client/team gets alerted to activity | **Notifications** — in-app bell + full list (client `/portal/notifications`, staff `/admin/notifications`) + email side effects |
| Prospect or non-client needs to reach us | **Public contact + lead pipeline** — `/contact`, `/book`, `POST /v1/leads` into the CRM with an SLA timer |
| Sensitive/urgent issue | Direct email to the delivery team; every message and notification is audit-logged |

Adding a separate ticket entity now would **duplicate the messaging model**
(threads, authorship, read state, notifications) with a parallel status
lifecycle, for no V1 user need. That is scope we would build, test, secure
(tenant isolation, RBAC), and maintain — against demand that does not yet exist.

## What a future ticketing module would add (post-V1)

Revisit when any of these becomes true: support volume outgrows per-project
threads, clients expect SLA-tracked tickets, or a non-engagement support queue
(billing, account, general) is needed. A V2 module would introduce:

- A `SupportTicket` model (subject, category, priority, status lifecycle
  `OPEN → PENDING → RESOLVED → CLOSED`, SLA timers) reusing the existing
  message/notification/audit infrastructure rather than duplicating it.
- A client "Support" surface to open/track tickets independent of a project.
- A staff support queue with assignment, priority, and SLA reporting — a natural
  extension of the existing `/admin` workspace and RBAC matrix.
- Optional email-to-ticket ingestion (the Postmark inbound webhook pattern).

## Net

No V1 functionality is missing: clients can reach their team, get notified, and
prospects can reach the business. Ticketing is a **scale feature**, correctly
deferred until engagement volume justifies it. This is a documented product
decision, not an unfinished feature.

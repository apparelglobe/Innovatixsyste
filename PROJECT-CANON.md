# Innovatix — Project Canon

> **The single source of truth for what we are building and why.**
> When a new decision is made, add it here. When in doubt, this document wins.
> The goal of this file is to keep us aligned and stop us drifting from the core project.

**Last updated:** 2026-08-13

---

## 0. North Star

**Innovatix is relationship-driven, not project-driven.**

- The platform supports the *entire* client relationship — from first proposal, through delivery, into long-term partnership.
- Projects begin and end. **The relationship continues.**
- The client's **Workspace is their permanent home** with Innovatix: same account and login throughout, changing shape as the relationship grows.
- **Simplicity comes from what you hide, not from what you add.**

---

## 1. The Client Lifecycle

```
Visitor → Lead → Consultation → Proposal → Active Client → Project Delivery → Ongoing Partnership
```

The **relationship** is the container. Inside it, over time, can live: proposals, projects (multiple), retainers, support, billing, files, messages, and history — without separate systems or accounts.

---

## 2. Website & Consultation

The website educates the visitor and builds confidence, then encourages them to **book a consultation**. It exists to inform — not to quote.

**A visitor arrives two ways:**
1. **Paid / organic search** → lands on the **specific service page** for what they searched (e.g. "mobile app development").
2. **Organic / direct** → the first thing they should see is **the services we offer**.

The site explains: the services, our capabilities, our process, and examples of our work.

**Deliberately reserved for the consultation** (because every project is unique and these depend on the client's actual requirements):

- Project pricing
- Technical architecture
- Programming languages / technology stack
- Infrastructure recommendations
- Project timeline
- Feature prioritisation & implementation approach

**Principle:** the website's job is to educate, build confidence, and drive a consultation booking — not to answer everything.

---

## 3. Lead Capture

Two ways to make contact. **Both create a lead the same way behind the scenes;** only the next step differs.

### Contact (`/contact`) — general enquiries, questions, partnerships, support
```
Contact Form → Create Lead → Confirmation Message → End
```
Confirmation: *"We've received your enquiry and will be in touch shortly."*
No scheduling shown.

### Book Consultation (`/book`) — ready to discuss a project
```
Book Consultation Form → Create Lead → Select Date & Time → Consultation Confirmed
```

### Shared workflow (both forms)
- Create a lead in the CRM
- Store the visitor's information
- Notify the appropriate team
- **Difference:** Contact shows a confirmation message; Book opens the calendar.

### AI Assistant — the Guided Needs-Finder
A **guide, not a consultant.** It educates visitors, answers general questions, and directs qualified prospects toward booking a consultation. It never quotes or advises on the reserved items in §2.

Concretely, it takes the shape of a **Guided Needs-Finder** for visitors who don't know what they need: a few **plain-language questions** (pick an option **or** describe the problem in their own words) → the AI matches their answers against the **full service catalog** behind the scenes → suggests the **1–3 services that fit**, in plain language → routes to **Book a consultation**.

Principles:
- The visitor **never browses or self-selects** from the full catalog — they describe the problem; the AI does the matching.
- **Suggests, never commits.** It surfaces fitting services and builds confidence; it never quotes price, timeline, or architecture (§2) — those are for the consultation.
- **Never a gate.** Visitors who already know what they want skip straight to booking.
- **Captures the lead either way** — the visitor's answers and the AI's suggested service attach to the lead, giving the team real context for follow-up even if the visitor doesn't book.
- Serves both entry paths equally: a **paid-search** visitor and an **organic** visitor converge on the same thing — *describe your problem to a guide*, not *decode a service catalog*.

---

## 4. Consultation Scheduling

**Innovatix owns the entire booking experience.** The visitor never interacts directly with Google — every step feels like part of the Innovatix platform.

```
Book Consultation → Create Lead → Select Date & Time
→ Create Google Calendar Event → Generate Google Meet Link
→ Send Confirmation & Calendar Invite → Consultation
```

**Google Workspace runs entirely in the background**, responsible for: calendar events, Google Meet links, calendar invitations, email confirmations, reminders, rescheduling, cancellations.

---

## 5. Project Activation

A prospect becomes a client **only after all three** are complete:

1. **Proposal approved**
2. **Agreement signed**
3. **Activation payment received** (standard **33%** deposit — but the system treats this as *the project's activation payment*, not a hard-coded percentage)

Only then does the system:
- Create the Client Portal / Workspace
- Generate the client account
- Let the client set their password
- Create the project workspace
- Officially begin the project

Until all three are met, the opportunity stays in the **sales pipeline** and the project is **not active**. **The deposit is the activation gate.**

---

## 6. Workspace Experience

**Action-driven, not navigation-driven.** On every login, the Workspace immediately answers two questions:

1. **What is happening?**
2. **What do I need to do next?**

Everything else stays secondary and appears only when relevant.

### Primary workspace always contains
- Current project or service
- Current status
- **One clear next action**
- Quick access to Files, Billing, Messages
- A timeline of important relationship milestones

Calm, focused, uncluttered.

### Current Status — always one primary status

**Your Turn** — Review Proposal · Sign Agreement · Pay Activation Payment · Approve Design · Review Deliverable · Pay Invoice · Upload Requested Files

**Our Turn** — Proposal Under Review · Development In Progress · Design In Progress · Quality Assurance · Preparing Launch · Monitoring & Support

If no client action is required, the workspace clearly says Innovatix is working, **and gives the next expected update**.

### Relationship Timeline (meaningful moments only — never raw system events)
Proposal Sent · Proposal Accepted · Agreement Signed · Activation Payment Received · Project Started · Milestone Approved · Project Launched · Retainer Activated · New Project Started

### Navigation (minimal)
**Home · Projects · Billing · Messages.**
Files, invoices, support and project detail surface *within the current project or when relevant* — they do not permanently occupy the main nav.

### Design Principles
- Show one clear status.
- Show one clear next action.
- Surface only what's relevant to the client's current stage.
- Hide complexity until it becomes relevant.
- Keep it calm and focused.
- The customer should never wonder what's happening or what to do next.
- **Simplicity comes from what you hide, not from what you add.**

---

## 7. Current State vs. Vision — Gap Analysis (as of 2026-08-12)

Legend: ✅ built · 🟡 partial · ❌ missing

| Canon area | Status | Reality today |
|---|---|---|
| **§2 Website educates, reserves pricing/architecture/etc.** | 🟡 | Site educates (services, process, work). Pricing & technical detail are already *not* on the site — the "reserve for consultation" philosophy already matches reality. **But confidence is weakened: case studies are hidden/unverified (no proof).** |
| **§3 Contact vs Book, shared lead workflow** | ✅ | Both forms exist, both create a lead the same way, both notify. Contact → confirmation; Book → calendar. **Matches the canon almost exactly.** |
| **§3 AI Assistant (guide)** | ❌ | No AI assistant / chatbot exists on the site. Entirely new. |
| **§4 Booking experience owned by Innovatix** | 🟡 | Native scheduler exists (pick a slot → Meeting record → confirmation email). Innovatix owns the flow. |
| **§4 Google Workspace background (Calendar event, Meet link, invites, reminders, reschedule, cancel)** | ❌ | Not integrated. No Google Calendar/Meet. No reminders/reschedule/cancel. (A legacy Cal.com webhook exists but is not this.) |
| **§5 Project activation gate (proposal → sign → deposit)** | ❌ | **Biggest gap.** No proposal, agreement, or deposit step. Activation today = a staff member clicking **"Convert"** by hand. The *mechanism* it triggers (create client org + account + secure password invite + project) **exists** — but the *gate* does not. |
| **§6 Active workspace screens (progress, milestones, approvals, files, invoices, messages, team)** | ✅ | This is essentially the current portal. The screens exist and work. |
| **§6 Action-driven model (one status, one next action, Your Turn / Our Turn)** | 🟡 | An "action needed" card exists (partial "Your Turn"). But the portal is **navigation-driven (8 tabs)**, not action-driven. No unified single status; no "Our Turn — next update [date]." Needs a **reframe**, not a rebuild. |
| **§6 Relationship timeline (curated, not raw)** | 🟡 | The split already exists in the data (a curated client feed *and* a separate internal audit log). The feed only covers project events today; relationship moments (proposal accepted, deposit paid, retainer started) can't appear because those stages don't exist yet. **Mechanism ready; content missing.** |
| **§6 Minimal nav (Home · Projects · Billing · Messages)** | 🟡 | Today: 8 nav items. Vision: 4. Trim + reframe. |
| **Long-term / retainer / support / multi-project hub** | ❌ | No retainer/subscription, no auto-pay, no support tickets (only project chat). Portal effectively ends at launch. |
| **Permanent relationship container holding many projects** | 🟡 | The account is permanent and the data model *allows* many projects per client, but the experience centres on a single active project. Container exists in data; **hub experience doesn't.** |

**One-line summary:** the **middle is built** (delivery + billing + accounts — the hardest, proven part). The **front** (proposal → agreement → deposit → activation) and the **back** (retainer, support, multi-project hub) are missing, and the **workspace shell needs a reframe** from navigation-driven to action-driven. Most missing pieces have foundations already in place, so it is **extension, not rebuild.**

---

## 8. Open Questions / Decisions To Make
- Exact deposit default (33% confirmed as standard; keep it configurable).
- Does the AI Assistant get built in-house or use a third-party widget to start?
- Google Workspace vs. keeping the native scheduler — how much of Calendar/Meet/reminders to integrate first.
- Can a client have more than one active project at once? (Decides how hard we push the "hub" model.)
- Build-vs-buy for the CRM/sales desk in early stages.

---

## 9. Change Log
- **2026-08-13** — §3 AI Assistant sharpened into the **Guided Needs-Finder**: plain-language questions (pick or type) → AI matches against the full catalog → suggests 1–3 fitting services → routes to booking. Suggests, never quotes; never a gate; captures the lead + suggested service either way. Interactive prototype demonstrated. Remains **Phase 5** in the build roadmap; depends on the (now-built) service catalog.
- **2026-08-12** — Canon created. Captured: north star, lifecycle, website/consultation, lead capture, scheduling, activation gate, workspace experience, and the first current-state gap analysis. Sources: the platform's live code + database, and the product brainstorms in this working session.

# Handoff: EMHIP — Mental Health Hub Case Management

## Overview
EMHIP is a case-management application for community mental-health hubs. Staff (CMHWs — Community Mental Health Workers — and Hub Managers) register and track "guests", run casework sessions, record follow-up contacts, flag urgent/safeguarding cases, and produce service-level reports.

This bundle contains the design system, screen extractions, and an interactive prototype, plus a proposed .NET backend architecture (see `ARCHITECTURE.md`).

## About the Design Files
The files in this bundle are **design references created in HTML**, extracted from the EMHIP Figma file. They are prototypes showing intended look and behavior — **not production code to copy directly**. The task is to **recreate these designs in the target codebase** (recommended: ASP.NET Core Web API backend + a React/TypeScript or Blazor frontend) using its established patterns and libraries.

## Fidelity
**High-fidelity.** All screens were extracted from the dev-ready Figma frames with exact colors, spacing, and typography. Recreate pixel-perfectly.

## Screens / Views
All nine screens are pre-rendered React components in `screens/Components.bundle.js` (catalog: `screens/Components.d.ts`), extracted from the Figma Prototyping page's clean 1440px desktop frames. View them interactively via `EMHIP Prototype.dc.html`.

- **Dashboard** (`Dashboard`) — home: urgent-case banner, guest overview KPI cards (total active, pending conversation, inactive, urgent), active-guest list.
- **Service Overview** (`Dashboard2`) — service-level dashboard: pathway distribution, monthly stats, recent activity.
- **Guest Data Sheet** (`GuestDataSheet`) — full searchable/filterable guest list with status badges and avatars.
- **Guest Workspace — Overview** (`GuestOverviewTab`) — a single guest's record (Overview tab; the Figma file has sibling tabs: Demographics, Clinical Details, Initial Conversation, Pathway, Actions, Follow-up, DIALOG — plus risk assessment: suicidal ideation, self-harm, risk to others, severe deterioration, safeguarding concern).
- **Register: Demographics** (`DmegographicsTab`) — guest registration intake step (layer name carries the Figma typo "Dmegographics").
- **Initial Conversation** (`InitialConversationTab`) — initial-conversation capture step.
- **Global Follow-up** (`Desktop34`) — global follow-up queue with add-entry flow.
- **Urgent Cases** (`Desktop46`) — triage list of flagged cases.
- **Reports** (`Desktop50`) — service-level reporting: pathway categories (housing advice, employment support, benefits & financial support, food & essentials, immigration/legal advice signposting, other practical advice).

## Interactions & Behavior
- Top-level navigation between the nine screens (prototype uses a switcher bar; the real app should use the left sidebar nav present in each screen).
- Guest List rows open the Guest Workspace.
- "Register New Guest" and "Add Contact" are modal/full-page forms with validation (required demographics, consent).
- Risk flags (suicidal ideation, self-harm, risk to others, severe deterioration, safeguarding) escalate a guest onto the Urgent Cases queue.
- Follow-up contacts are scheduled with due dates; overdue items surface on dashboards.

## State Management
- Current user + role (CMHW vs Hub Manager) drives which dashboard is home.
- Guest list: server-side pagination, search, filter state (see ARCHITECTURE.md — the dataset is large; never load all guests client-side).
- Guest Workspace: active tab, dirty-form tracking, optimistic note/sticky creation.
- Urgent case queue: near-real-time (polling or SignalR).

## Design Tokens
Full token set (189 Figma variables) in `design-system/fig-tokens.css` and `screens/fig-tokens.css`. Key values:

- **Text primary** `#2A2A2A`; secondary `#8C8C8C` / `#8F8F8F`; body dark `#323232`
- **Brand red / danger** `#EB3C2C`, `#E12628`, `#DC2626`; **deep maroon accent** `#941C3C`; `#D02537`
- **Surfaces** `#FFFFFF`, `#F7F7F7`, `#FAFAFA`, `#F8FAFC`; borders `#E5E5E5`, `#E8E8E8`, `#D9D9D9`
- **Success tint** `#EAFDEE`; slate `#334155`; gold accent `#9D852D`
- **Type**: Plus Jakarta Sans (primary UI — Medium 14/12px body, SemiBold 12–20px headings, Bold 11px labels), Wix Madefor Display (SemiBold 10px badges/labels), Inter (SemiBold 14px, tables)
- **Radii/shadows**: per-component; see materialized `.jsx` files — values are exact, do not snap to a grid.

## Assets
- `design-system/icon-data.js` — 24 icons as SVG path data, rendered via `design-system/Icon.jsx` (`currentColor`).
- `design-system/assets/` and `screens/assets/` — bitmap assets (avatars, illustrations) referenced by `fig-assets.css` classes.
- Note: one Figma icon (`Check Verified 02`) had no decodable geometry and is omitted — export it manually from Figma if needed.

## Files
- `EMHIP Prototype.dc.html` — interactive prototype (open in a browser; screen switcher on top).
- `screens/Components.bundle.js` + `Components.d.ts` — the nine screens + shared components as plain-JS React globals.
- `design-system/*.jsx` + `*.d.ts` — the component library (Avatar, BadgeNumberDot, CheckboxTick, Chip, InputField, Label, NoteStamp, Priority, Sticky, Tags, Day, Event, HourRow, Tile, StickyNote*, NoteDetails, icons).
- `design-system/fig-tokens.css`, `fig-typography.css`, `fig-assets.css` — tokens and asset classes.
- `styles.css` — global entry: Google Fonts + token imports.
- `ARCHITECTURE.md` — proposed .NET 10 backend architecture for large datasets.

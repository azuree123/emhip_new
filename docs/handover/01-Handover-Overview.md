# EMHIP Handover Overview

_Version 1.0 · 30 September 2026 · For: the customer project team and service leads_

This document is the front page of the EMHIP handover pack. It says what EMHIP is, what is being handed over and where each part lives, the state of the system at handover, and what both sides need to do to complete the handover. The other documents in the pack hold the detail and are listed in section 6.

## 1. EMHIP in brief

EMHIP (Ethnicity & Mental Health Improvement Project) is a web-based case-management system for community mental-health hubs. Hub staff use it to register the people they support (called guests), record every contact, manage clinical risk, and report on the service's reach and outcomes, with a focus on ethnic-minority communities.

| Module | What it does |
| --- | --- |
| Dashboards | A caseload dashboard for CMHWs and CPNs, and a hub-wide dashboard for Hub Managers in which every count opens the guests behind it |
| Guest register | Search and filter guests; register new guests in five steps (demographics, initial conversation, DIALOG baseline, pathway, review) |
| Guest record | One record per guest with tabs for demographics, clinical details and risk, DIALOG scores, pathway history, care plan, contacts, CPN record, documents, actions and notes |
| Contacts | The Add Contact form (SBAR casework notes, CPN assessments and sessions, MDT and CPN referrals), Contact History and Scheduled contacts |
| Urgent cases | Risk flags open an urgent episode with a 72-hour contact window, live updates, CMHT escalation and a full episode record |
| MDT queue | Hub Managers confirm CPN referrals, decline requests and record MDT discussions |
| Reports | Overview, guest report, pathways, caseload, DIALOG outcomes (filterable by demographics), data quality, CPN activity; Excel and CSV exports |
| Administration | Hub workers, roles and permissions, settings, email templates, option lists, custom fields and data import |
| Data protection | Access log per guest, subject-access export, anonymisation, retention review, idle sign-out |

## 2. What is being handed over

| Item | Where it is | Notes |
| --- | --- | --- |
| Live application | [emhip.brainshub.co.uk](https://emhip.brainshub.co.uk) | Production since 17 August 2026 |
| Source code | GitHub repository `azuree123/emhip_new`, branch `main` | A push to `main` deploys to production within about a minute |
| Production server | Ubuntu 24.04 host at `/opt/emhip`, run with Docker Compose | See document 06 for access, deployment and backups |
| Database and backups | SQL Server in the `sqlserver-data` Docker volume; backups in `/opt/emhip-backups` | Backed up before every deployment and nightly at 03:00; kept for 14 days |
| Uploaded documents | `/opt/emhip-documents` on the server while the storage setting is Local | Included in each backup |
| Secrets | `/opt/emhip/.env` on the server only | Never stored in the repository; the variable names are in `.env.example` |
| Documentation pack | `docs/handover` in the repository (Markdown, Word and PDF) | Listed in section 6 |
| Design and requirements sources | `project/` in the repository | Design handoff and architecture brief, screen designs, flow specification and the functional requirements (v2) |
| Testing feedback tracker | `docs/EMHIP_EPR_Testing_Feedback_Responses.xlsx` | The customer's round 1 sheet with a resolution and retest steps for each item |
| Live tester guide | [Tester Guide on claude.ai](https://claude.ai/code/artifact/dc8ab0bb-d1c8-4f5a-b4fb-aeba84042e4a) | Commentable copy of document 03, with a retest result column |

## 3. Environments and access

| Environment | Address | Purpose |
| --- | --- | --- |
| Production | [emhip.brainshub.co.uk](https://emhip.brainshub.co.uk) | Live service and, at present, user acceptance testing |
| Local development | A developer's machine (see document 05) | Building and testing changes before they are pushed |

There is no separate test or staging environment. Testing currently happens on production with made-up guests. See the open questions in section 8.

**Access to hand over**

- **Application:** the first Admin account is created from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in the server's `.env` file. There is no change-password screen yet, so replace that password with **Forgot password?** on the sign-in page once email works, or have a second Admin reset it under **Hub Workers**. Then create a named account for every member of staff.
- **Server:** SSH access to the production host, currently as root. Agree who holds it after handover.
- **Code:** administrator access to the GitHub repository. Whoever can push to `main` can deploy to production.
- **Secrets:** the `.env` file on the server holds the database password, the signing key for sign-in tokens, and email and storage credentials. Rotate them when access changes hands (document 06 explains how).

## 4. State of the system at handover

- **Features:** everything in the functional requirements (v2) and the design handoff is built. The 30 September release adds the customer's round 1 feedback.
- **Testing feedback, round 1:** all 13 items are resolved and ready to retest. Preparing this handover found further problems, and the ones that affected everyday work are fixed too. Document 07 lists every change; document 03 has the retest checklist.
- **Automated checks:** 74 unit tests and the API start-up test pass. The application builds cleanly; the only warnings are about stylesheet size and an older stylesheet syntax, and neither affects users.
- **Known issues:** a short list of limitations not fixed in this release, each with a recommendation, is in document 08. None of them blocks day-to-day use.
- **Data protection:** the technical controls for UK GDPR are in place. The organisation still has actions to complete, such as data processing agreements and a privacy notice (document 09, section 6).

## 5. Timeline

| Date | Milestone |
| --- | --- |
| 13 July 2026 | Project started; architecture and design handoff agreed |
| 17 August 2026 | First production deployment |
| 9 September 2026 | Urgent episode record, casework note attachments and UK GDPR controls |
| 30 September 2026 | Customer testing feedback, round 1, resolved; handover pack issued |

## 6. The documentation pack

Every document is in `docs/handover` as Markdown (the source), and as Word and PDF copies in the `word` and `pdf` folders.

| # | Document | For | Use it to |
| --- | --- | --- | --- |
| 01 | Handover Overview (this document) | Project team, service leads | See what is handed over and what remains to do |
| 02 | User Guide | CMHWs, CPNs, Hub Managers | Learn and look up every everyday task |
| 03 | Tester Guide | Testing team | Retest round 1 and test every workflow end to end |
| 04 | Administrator Guide | System administrators, Hub Managers | Manage staff, roles, settings, option lists, data import and data protection duties |
| 05 | Technical Handover | Developers, IT | Understand the architecture, code, configuration and how to change it safely |
| 06 | Deployment and Operations Runbook | Whoever runs the server | Deploy, verify, roll back, back up, restore and troubleshoot |
| 07 | Release Notes, 30 September 2026 | Project team, administrators | See exactly what changed in this release |
| 08 | Known Issues and Recommendations | Project team, developers | Decide what to fix next |
| 09 | UK GDPR Compliance Register | Data protection lead | See how each UK GDPR requirement is met and what the organisation must still do |

## 7. Handover checklist

**Customer**

- [ ] Read documents 01, 02 and 04, and share 02 with staff
- [ ] Retest the round 1 feedback with document 03 and record the results in the feedback sheet
- [ ] Sign in with the first Admin account, replace its password (section 3), and create named accounts for all staff
- [ ] Review the built-in roles and permissions (document 04) and adjust them if needed
- [ ] Set up email in **Settings → Email** and send a test email
- [ ] Confirm where documents should be stored (local server or cloud storage) and test the connection
- [ ] Complete the organisational actions in the UK GDPR register (document 09, section 6)
- [ ] Review the known issues (document 08) and agree which to fix next
- [ ] Sign off the handover

**Development team**

- [ ] Deploy the 30 September release and confirm it is live (document 06)
- [ ] Run a test restore of the latest backup and record the result
- [ ] Hand over server, GitHub and email or storage provider access to the named owners
- [ ] Rotate the secrets in `.env` once access has changed hands
- [ ] Walk the customer's IT contact through documents 05 and 06

## 8. Open questions

These need an answer from the customer before the handover can be closed.

- Should a separate test environment be set up, so that testing no longer happens on the live system?
- Who will provide support after handover, with what response times, and how should issues be raised?
- Who will hold administrator access to the server and to the GitHub repository?
- Is multi-factor sign-in required? It is not built yet; document 08 explains the options.

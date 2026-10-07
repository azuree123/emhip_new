# EMHIP Release Notes: 7 October 2026

_Version 1.0 · 7 October 2026 · For: the customer project team, testers, Hub Managers and administrators_

This release answers the customer's updated feedback sheet (EMHIP EPR Build Feedback, updated 7 October 2026, called Build Feedback v3 below). It gives the urgent case feature one name throughout, rebuilds the Urgent Case Record to the customer's field specification (EMHIP\_Urgent\_Case\_Record\_Spec.docx), adds a Casework Notes tab and applies the NHS minimum of 8 years to documents. Every open item is done except item 34, clearing the test data, which needs the customer's approval first. Two database migrations run automatically when the release is deployed. There are no new settings.

## At a glance

| Area | Change |
| --- | --- |
| Urgent cases (items 5 to 11 and 13) | "Urgent Case" everywhere; an Other risk type and compulsory notes; no popup on the dashboard; the Urgent Case Record rebuilt to the specification, with a record of any call to the CMHT in place of Escalate to CMHT |
| Clinical details (14, 15) | Risk checkboxes removed; Immediate risk flag is read-only and fills itself in from the guest's urgent cases |
| Contact logging (16, 19) | Contact History leads with the contact type; a new Casework Notes tab |
| Care plan (21) | Coloured status labels |
| Documents (23) | No permanent deletion within 8 years of upload; default retention of 8 years |
| Fixed in round 1 (25, 27 to 32) | Checked again and still working, with small additions |
| Minor (33, Profile Completion) | The Demographics filter panel is always fully visible; Complete and Incomplete wording |
| Not done (34) | Clearing the test data waits for the customer's approval |

## Changes from the feedback sheet

Numbers match Build Feedback v3, which numbers items differently from round 1: for example, item 25 here was item 9 in round 1. Items 1 to 3 and 24 were already marked Resolved in the sheet, and rows 4, 12, 17, 18, 20, 22 and 26 are blank. Document 03 has the full walkthrough and a column for retest results.

| # | Feedback | What changed | How to retest |
| --- | --- | --- | --- |
| 5 | The urgent case feature has three names: "Urgent Flag", "Urgent Case" and "Crisis Episode" | "Urgent Case" everywhere. The guest header button is **Raise Urgent Case**, and its panel's button is **Raise urgent case**. The dashboard button is **View Urgent Case Record**, the record is the **Urgent Case Record**, and its tabs are Urgent Case 1, 2 and so on. Registration's "crisis notes" are now **urgent case notes**, and the registration and Initial Conversation hints say "raises an urgent case". Reports and the Excel export say "Urgent cases raised". The email subject reads "URGENT CASE: [guest] ([reference])" and the body "was raised as an urgent case". The export file is named urgent-case-G-[number]-[case].txt, and the Access Log says "Exported urgent case record" | Raise a case and follow it through the guest header, Urgent Cases, the record, its export, Reports and the email. No screen should say Urgent Flag, Crisis Episode or Episode |
| 6 | Add "Other" to the risk types, with a box to describe it | **Other** is added under **Risk identified**. Ticking it shows **Describe the other risk**, which is required. The risk shows as "Other: [description]" on the Urgent Cases row, the Urgent Case Record, the CSV export and the email, and the **Risk Level** filter offers Other | Raise a case with Other ticked: without a description the button stays greyed out; with one, check the four places |
| 7 | Make the notes compulsory | **Urgent case notes** are required. **Raise urgent case** stays greyed out until they are entered, and the server also refuses a case with no notes, or Other with no description | Tick a risk and leave the notes empty: the button cannot be used |
| 8 | Remove the popup on the Urgent Cases dashboard | The small Urgent Case Details popup is removed. Clicking anywhere on a case row, open or resolved, opens the full Urgent Case Record. Each row has **Open Guest** and **View Urgent Case Record**; resolved rows gain Open Guest. Crisis notes, Escalate to CMHT and Mark resolved are no longer on the dashboard; a case is resolved on its record | Click an open case and a resolved case: the record opens, with no popup |
| 9 | Rename "View Crisis Episode" | The button reads **View Urgent Case Record**, on open and resolved rows | Urgent Cases |
| 10 | The record shows "Flag raised by: System Administrator" | **Flag raised by** always shows the name of the account that raised the case, taken from the sign-in; EMHIP does not put "System Administrator" there itself. It appeared because testing was done with the shared bootstrap Admin account, whose name is System Administrator. Staff must sign in with their own accounts; an Admin can rename the shared account on **Hub Workers**, or deactivate it. Cases raised from the Initial Conversation tab with Immediate risk "Yes" now also store who raised them on the case itself. Cases already raised under the shared account keep its name until the clean-up in item 34 | Sign in with your own account, raise a case and check that Flag raised by shows your name |
| 11 | Remove "Escalate to CMHT" and let staff record the call instead | Escalate to CMHT is removed, because EMHIP has no connection to the CMHT. Under **Actions taken**, **CMHT or other NHS team notified** asks Yes or No. Yes asks for **Name of person called** (required), **Team or service**, **Called by** (from the sign-in, read-only), **Date and time of call** (required) and **What was said**. The saved answer is read-only, with **Edit** while the case is open. Earlier escalations were carried over as Yes, with the old reason and urgency at the top of What was said. The unused Escalation reasons and Escalation urgency lists are hidden in **Settings → Lookups** | On an open case, save Yes without a name (refused), then with a name and time; edit it to No; check the audit trail |
| 13 | Rename the "Episode 1", "Episode 2" tabs | The tabs read **Urgent Case 1**, **Urgent Case 2** and so on, oldest first. The open case is shown first | Resolve a guest's case, raise another, and open the record |
| 14 | Remove the risk checkboxes and "Save assessment" from Clinical Details | The checkboxes, **+ Record assessment** and **Save assessment** are removed. Urgent cases are raised only with **Raise Urgent Case**, or by immediate risk at intake, and each starts the 72-hour window | Clinical Details tab |
| 15 | Make "Immediate risk flag" read-only and automatic | It reads "Yes — urgent case open" with the date and time raised; "No open urgent case" with when the last one was raised and resolved; or "No urgent case raised". The field below, "Urgent episodes", is now **Urgent cases**: a lifetime count of the guest's urgent cases | Clinical Details before raising a case, while it is open and after it is resolved |
| 16 | Contact History should show the type of contact, not only the method | Each row on the guest's Contact History tab leads with the type chosen in Add Contact (Casework, Activity, Hospitality, AFA, or CPN contact). The method (Phone call, Text message and so on), date and who recorded it are the smaller detail underneath. Contacts with no casework note, such as older imports, read "Contact" | Log a contact of each type and check the tab |
| 19 | A separate "Casework Notes" tab | A new **Casework Notes** tab after Contact History lists only Casework notes, newest first, with the same expand, resume and attachment behaviour as Notes. It has no quick notes. Contact History and Notes are otherwise unchanged | Guest record, Casework Notes tab |
| 21 | Care plan status labels are grey | **Active** is green, the same as an Active guest's status, and **Closed** is blue | Care Plan tab, with an active and a closed plan |
| 23 | How long are deleted documents kept? It must meet the NHS minimum of 8 years | Deleted documents stay in the recycle bin until someone permanently deletes them. Nothing is purged automatically, and permanent deletion is a manual action that only Admins have by default. No document can now be permanently deleted within 8 years of upload. **Default retention (years)** is 8, and a lower saved value is treated as 8. A **Retain until** date earlier than upload plus 8 years is refused with a message, and a blank date means upload plus 8 years. Existing documents with no date or a shorter one were moved to upload plus 8 years. The upload and edit forms explain this | Upload a document with Retain until set to next year (refused). In the recycle bin, try to permanently delete a recent document (refused) |
| – | Guest dashboard: "Complete" versus "Incomplete" on Profile Completion | The Demographics tab's **Profile completion** card and section labels read **Complete** and **Incomplete** instead of Completed and Pending, and the button beside an unfinished section reads **Complete now** | Demographics tab of a partly completed guest |
| 25 | Add demographics and referral sources to the Excel export | Done in round 1 (item 9) and checked again: the workbook has **Demographics** and **Referral sources** sheets, and the CSV has ethnicity, age group, gender, country of origin, referral source and referral type columns | Reports, Export to Excel and Export CSV |
| 27 | Remove CPN sessions from the AFA & Hospitality tile | Done in round 1 (item 6) and checked again: the tile counts AFA and hospitality only, and CPN activity has its own section | Contact History |
| 28 | "On hold" to "Inactive" everywhere | Done in round 1 (item 11). Also: the guest import (**Settings → Data migration**) now accepts "Inactive" as a status | Any status badge or filter; import a row with status Inactive |
| 29 | "Follow-up" to "Contact" everywhere | Done in round 1 (item 12). Also: **Settings → Lookups** shows **CPN contact frequency**. Email templates nobody has edited are refreshed to the current wording when the system is updated, so the overdue-contacts email no longer says "follow-up". **Restore default** puts a template back on the standard wording and keeps it updated | Settings, Lookups and Email templates; an overdue-contacts email |
| 30 | Spelling of "CASE MANGEMENT" | Done in round 1 (item 13): the menu reads CASE MANAGEMENT | Left menu |
| 31 | Technical labels in the staff activity log | Done in round 1 (item 14): plain English, with the guest's name | Hub Manager dashboard, Staff activity |
| 32 | Staff names cut off | Done in round 1 (item 15). Also: the CMHW and assignee filters widen to fit the chosen name on the guest list, Contact History, Scheduled contacts, the Reports guest report and the dashboard preview panel. On Contact History, the line under each guest wraps instead of cutting off the CMHW's name | Choose a long name in each CMHW filter |
| 33 | The demographics filter panel opens behind the left menu | The panel opened leftwards from its button, so when the filter row wrapped onto a second line it ran under the menu and was cut off. It now opens on whichever side has room | Guest list at a narrow window: open **Filters** |
| 34 | Clear all test data before UAT | **Not done.** This cannot be done through the screens: it means removing records from the live database, for example test guests, the urgent case note "My name is hamza" and records made as System Administrator. The customer needs to approve what is removed; it will then be done after a full backup, with a reviewed script. Until then, test with named accounts so that new records carry real names | No retest yet. See document 08, item 1.12 |

## The Urgent Case Record

The record is built to the customer's specification. It opens over the Urgent Cases screen when a case is clicked, and is laid out in seven parts.

| Part | What it shows |
| --- | --- |
| 1. Header | Guest name (opens the guest's record), Reference ID, Assigned CMHW and Pathway at time of flag; **Open Guest**, **Export Record** and close |
| 2. Status bar | A live 72-hour countdown with a progress bar: amber while open, red when fewer than 6 hours remain or the deadline has passed, green once resolved (it stops at the time of resolution). Also the Deadline and the Case status, Open or Resolved |
| 3. Flag details | Flag raised by (from the sign-in), Flag raised at, Risk identified (including Other) and the Urgent case notes, all read-only |
| 4. Actions taken | **CMHT or other NHS team notified** (item 11); **Contacts logged since flag**, a count that lists those contacts (type, method, date, staff) with a link to Contact History; **Add contact**, which opens the Add Contact form over the record |
| 5. Resolution | **Mark as resolved** opens a dialog showing Resolved by (you), Resolved at (now) and Resolved within 72h, and asks **Inpatient admission** (Yes or No, required) and **Any other external service involved** (for example ambulance, A&E or police). Afterwards the record shows all five |
| 6. Tabs | One tab per urgent case, Urgent Case 1, 2 and so on, oldest first; the open case is shown first |
| 7. System audit trail | Urgent case raised, Further risk recorded, Contact logged, CMHT notified or not notified, and Urgent case resolved, each with the staff name, date and time, oldest first |

Resolving no longer asks for a resolution note, a pathway re-entry decision or a next contact date. Older cases still show the resolution note they were given.

## Also changed

- **Raising again while a case is open** adds the new risk to the same urgent case, shown in its audit trail as "Further risk recorded".
- **The urgent-case email** says "Risk identified:" and "This guest is now on the Urgent Cases dashboard."
- **Reports → Overview → Contact activity** and the Excel Summary sheet count "Urgent cases raised": urgent cases opened in the period. Before, every flagged risk assessment was counted, including a second risk added to an open case.
- **Guest list:** the Urgent badge and the **Urgent only** filter are described as "open urgent case" when you point at them.
- **Resolved rows on Urgent Cases** show who resolved the case and, where recorded, "CMHT notified" with the team.

## What users will notice

- Wording: "Urgent Case" and "Urgent Case Record" instead of urgent flag, crisis episode and episode record.
- Clicking a case on Urgent Cases opens the full record straight away. Contacts, the CMHT record and resolving are all on the record.
- Resolving asks two questions only. Change a pathway on the Pathway History tab, and record the next contact with Add Contact.
- Clinical Details no longer has a risk form, and Immediate risk flag cannot be edited.
- **Add Crisis Note** has gone with the popup. Put what was done in the urgent case notes, a contact or the CMHT record.
- Pinned quick notes used to show under Crisis Actions Taken in the popup. That panel is gone, so they are listed first on the Notes tab only (document 08, item 2.5).
- A new **Casework Notes** tab on every guest record.
- Documents uploaded in the last 8 years cannot be permanently deleted, and a Retain until date earlier than 8 years after upload is refused.
- The "Urgent cases raised" figure in Reports can be lower than the old "Urgent flags raised" figure for the same period, because it counts cases rather than risks.

## Upgrade notes for administrators

- **Deployment:** two database migrations run automatically when the new version starts, after the usual pre-deployment backup. There are no new settings and no changes to `.env`.
    - `UrgentCaseRecordSpec` changes the urgent-case table for the CMHT record and the Other risk type. Every earlier escalation to the CMHT becomes "CMHT notified: Yes", called at the time it was sent, with its reason and urgency at the top of What was said.
    - `DocumentRetentionMinimum` moves every document's Retain until date to at least 8 years after upload. The earlier, shorter dates are not kept.
- **Default retention (years)** now defaults to 8. If a lower value (including 0) was saved, it is treated as 8; set it to 8 or more so the screen matches.
- **Email templates:** templates nobody has edited take the new wording at deployment, including the urgent-case email. A template you have edited keeps your wording, so review **Urgent case raised** if you changed it: it may still say "flagged" or "Risk flags". Use **Restore default** to take the new wording; the template then follows future wording updates too.
- **Lookups:** **Escalation reasons** and **Escalation urgency** are hidden. Their options are kept in the database. **Cpn follow up frequency** is now shown as **CPN contact frequency**.
- **Shared Admin account:** give every tester and member of staff a named account, then rename the bootstrap System Administrator account on **Hub Workers** or deactivate it (document 04, section 1.1). Keep at least two named Admin accounts.
- **Test data (item 34):** waiting for the customer's approval of what to remove.

## Retesting

The Tester Guide (document 03) has a walkthrough of the Urgent Case Record, a table of these changes with a column for retest results, and the end-to-end checklist. Known issues that are not fixed in this release, including the shared account and the test data, are in document 08, Known Issues and Recommendations.

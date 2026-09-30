# EMHIP User Guide

_Version 1.0 · 30 September 2026 · For: CMHWs, CPNs and Hub Managers_

This guide shows front-line staff and Hub Managers how to use EMHIP day to day. It covers signing in, the dashboards, finding and registering guests, the guest record, recording contacts, urgent cases, the MDT queue, scheduled contacts and reports. Tasks are written as numbered steps, and section 11 is a one-page quick reference. Staff accounts, roles and settings are covered in the Administrator Guide (document 04).

## 1. Introduction

### 1.1 What EMHIP does

EMHIP (Ethnicity & Mental Health Improvement Project) is the case-management system for community mental-health hubs. The people the hub supports are called guests.

You use EMHIP to register guests, record every contact with them, manage risk, plan their support and report on the service. Each guest has one record, and everything on it shows who recorded it and when.

### 1.2 Who uses EMHIP

| Role | What they do in EMHIP |
| --- | --- |
| CMHW (Community Mental Health Worker) | Registers guests, holds a caseload, records contacts, manages risk and care plans |
| CPN (Community Psychiatric Nurse) | Everything a CMHW does, plus the CPN initial assessment and CPN contact sessions |
| Hub Manager | Everything a CMHW does except CPN work, plus the hub-wide dashboard, MDT queue, access logs, record exports and report exports |
| Administrator | Staff accounts, roles, settings and anonymisation (see the Administrator Guide) |

What you see depends on the permissions of your role. An Administrator can change them, so your screens may differ slightly from this guide. Where a task needs a permission that not every role has, this guide says who has it by default.

### 1.3 Sign in

1. Open EMHIP in your web browser at [emhip.brainshub.co.uk](https://emhip.brainshub.co.uk). Chrome, Edge and Safari all work.
2. Enter your **Email** and **Password**.
3. Select **Sign in**. Your dashboard opens.

| Message | What it means |
| --- | --- |
| Enter a valid email address. | The email box is empty or not an email address |
| Invalid email or password. | The details are wrong, or the account is locked or switched off |
| Too many sign-in attempts. Please wait a minute and try again. | Too many attempts in a short time from your network |

After five wrong passwords your account is locked for 15 minutes. The message still says "Invalid email or password". Resetting your password does not unlock the account, so wait 15 minutes before trying again.

### 1.4 Sign out

Select **Log out** at the bottom of the left-hand menu. Always sign out on a shared computer.

A session also ends on its own after 8 hours. EMHIP then shows "Your session expired. Please sign in again."

### 1.5 Forgotten or changing your password

There is no separate change-password screen. Use these steps to reset a forgotten password or to change your current one.

1. On the sign-in page, select **Forgot password?**
2. Enter your email address and select **Send reset link**.
3. EMHIP shows "If an account exists for that email, a reset link is on its way." Open the email and select the link. It works for 24 hours.
4. Enter a **New password** and type it again in **Confirm password**.
5. Select **Reset password**, then **Continue to sign in**.

Your password must have at least 10 characters, including a capital letter, a small letter and a number.

> **Tip:** If your new password is refused, the page says which rule it breaks. If it says the link is invalid or expired, request a new link. If the email does not arrive, ask an Administrator to reset your password.

### 1.6 Automatic sign-out when you are away

EMHIP signs you out after 30 minutes without activity, so an unattended screen does not expose guest records. Your Administrator can change the time.

One minute before sign-out, a banner at the top counts down: "You will be signed out in 60 seconds due to inactivity." Select **Stay signed in**, or move the mouse or press a key, to carry on.

After an automatic sign-out the sign-in page says "You were signed out after a period of inactivity, to protect guest records on an unattended screen."

> **Warning:** Anything you have not saved is lost when you are signed out. Save long notes as a draft before you step away.

### 1.7 The screen layout

The left-hand menu has three headings. You only see the items your role allows.

| Heading | Item | What it opens | Who sees it by default |
| --- | --- | --- | --- |
| OVERVIEW | Dashboard | Your home dashboard | Everyone |
| OVERVIEW | Guest | The guest list | Everyone |
| CASE MANAGEMENT | Urgent Cases | Guests with an urgent flag, with a count | Everyone |
| CASE MANAGEMENT | MDT Queue | Items waiting for MDT review, with a count | Hub Managers |
| CASE MANAGEMENT | Contact History | Contacts across the hub, per guest | Everyone |
| ADMIN | Hub Workers, Roles & Permissions | Staff accounts and roles | Administrators |
| ADMIN | Reports | Reports & Analytics | Everyone |
| ADMIN | Settings | Hub settings | Hub Managers and Administrators |

Two screens have no menu item. Documents are managed from each guest's **Documents** tab. **Scheduled contacts** opens from the Hub Manager dashboard (see section 9.3).

The bar across the top shows a greeting, today's date, the guest search box, a bell and your initial. Hub Managers and Administrators also see a gear that opens Settings.

- **The bell** shows a red dot when any urgent case is open. Select it to open Urgent Cases.
- On a narrow screen or tablet, the menu is hidden. Select the three-line button at the top left to show it.

### 1.8 Search for a guest from the top bar

1. Select the search box at the top of the screen.
2. Type at least two characters of a first name, surname or reference, for example `Test` or `G-1001`.
3. A list shows matching guests with their reference and status. Select one, or use the arrow keys and press Enter.
4. To search more widely, press Enter without choosing a suggestion. The guest list opens filtered to your text.

The suggestions match the start of a name, or an exact reference. The guest list search also matches any part of a name, a phone number and the assigned CMHW's name. Press Esc to close the suggestions.

### 1.9 Guest status and the urgent flag

Every guest has one of three statuses.

| Status | Meaning | How it changes |
| --- | --- | --- |
| New | Registered, but the initial conversation has not happened yet | Becomes Active when the initial conversation is completed |
| Active | The initial conversation is complete and the guest is being supported | Becomes Inactive automatically after 90 days without activity |
| Inactive | No activity recorded for 90 days | Goes back to Active when a new contact is recorded |

- EMHIP checks for inactivity automatically several times a day. The 90-day period is a setting your Administrator can change.
- New guests never become Inactive, and a guest with an urgent flag is never moved to Inactive.

The **urgent flag** is separate from status. It marks a guest who needs contact within 72 hours because of risk. It shows as a red **Urgent** badge beside the status, so a guest can be Active and Urgent at the same time. Section 7 explains how it is raised and cleared.

### 1.10 Two kinds of pathway

EMHIP has three pathways: **Mental Wellbeing**, **Clinical Support** and **Community Recovery**. A guest's pathway is chosen at the initial conversation, shown as a gold chip on the guest record, and changed on the **Pathway History** tab. Every **Pathway** filter, column and report uses these three.

The **AFA** flag marks a guest who also needs practical support alongside any pathway. See the glossary in section 12.

### 1.11 Guest references and links

Every guest gets a reference such as `G-1001`, shown as "Ref G-1001" or "ID: G-1001". Quote it instead of the guest's name wherever you can.

Guest names are links throughout EMHIP. Select a name to open the record. To open it in a new browser tab, Ctrl-click (Windows) or Cmd-click (Mac) the name, or click it with the middle mouse button.

## 2. Dashboards

The Dashboard is the first screen after you sign in. Hub Managers and Administrators see the Hub Manager dashboard. CMHWs and CPNs see the CMHW dashboard.

> **Tip:** Most dashboard counts are recalculated every 5 minutes. The list you open from a count is always up to date, so for a few minutes its total can differ from the count.

### 2.1 CMHW and CPN dashboard

#### Tiles

| Tile | What it shows | Select it to |
| --- | --- | --- |
| Active caseload | Active guests | Open the guest list filtered to your active guests |
| Due today | Scheduled contacts due today | Show guests due today in the Filter contacts table |
| Overdue contacts | Scheduled contacts whose date has passed | Show overdue guests in the Filter contacts table |
| Actions pending today | Scheduled contacts that are overdue or due today | Jump to the Actions pending today list |

#### Banners

- **Urgent banner:** shown when urgent cases are open anywhere in the hub, for example "2 urgent cases need attention — review the 72-hour contact window". It names the first guest and when the flag was raised. Select **View all urgent cases** to open Urgent Cases.
- **Overdue banner:** names guests whose scheduled contacts have passed with no entry. They stay on your overdue list until the scheduled contact is marked done.

#### Filter contacts

This card lists the guests assigned to you.

- **Search** matches a guest name, reference or CMHW name. The same box also filters the Actions pending today list.
- **Pathway** narrows the list to one of the three pathways.
- **Sort** orders it by next contact date, last activity or guest name.
- The **Contact Status** chips show All guest, Overdue, Due today - not seen and Upcoming this week. Each is based on the guest's next scheduled contact, and each shows its count.

The table shows each guest's status, pathway, last activity and next contact. The next contact is red when overdue, gold when due today or this week, and "Not scheduled" when there is none. Select a row, the name or **Open** to open the record.

#### Guest Seen

This card counts the distinct guests you have had a contact with in a period.

1. Choose **Today**, **Week**, **Month** (the default) or **Custom range**.
2. For a custom range, pick the **From** and **To** dates. The start must be on or before the end.
3. Select the arrow at the right of the card to see distinct guests seen, total contacts and a bar for each day. Point at a bar to see that day's count.

#### Clinical complexity indicators

Four tiles count guests across the hub with each indicator recorded on their Clinical Details tab: **SMI**, **On medication**, **Trust involvement** and **CPN involvement**. Select a tile to open the guests behind it.

#### Actions pending today

This list shows open scheduled contacts, soonest first. Each row reads "Contact due" with the guest's name, and says whether it is overdue, due today or due later.

- Select a row to open the guest's record.
- Select **Mark done** to complete that scheduled contact. It leaves the list.
- The Contact Status chips and the search box above also filter this list.

### 2.2 Hub Manager dashboard

#### Status tiles

| Tile | What it shows | Select the tile to | Select the arrow to |
| --- | --- | --- | --- |
| Active guests | Active guests, with this month's net change | Open the guest list filtered to Active | Preview active guests |
| New | Guests awaiting an initial conversation | Open the guest list filtered to New | Preview new guests |
| Inactive | Inactive guests, with the number moved this month | Open the guest list filtered to Inactive | Preview inactive guests |
| Urgent Cases | Guests with an urgent flag, with overdue scheduled contacts | Open Urgent Cases | Preview urgent guests |

#### The preview panel

The small arrow button on a tile opens a preview under the tiles. Select the arrow again to close it.

- It shows the first five guests, with a search box and **Pathway**, **Assigned CMHW**, **Last Activity** and **Next Contact** filters. The urgent preview has no search box or filters.
- The New preview shows the registration date and days waiting. Select **Start conversation** to go straight to that guest's Initial Conversation tab.
- The Inactive preview shows the last activity and months without activity.
- Select **View guest list** to open the full list with the same filters, or **View urgent cases** on the urgent preview.

#### Pathway distribution

One row for each clinical pathway, with the number of guests and a percentage. Select a row to open the guests on that pathway. The footer gives the hub total and how many have a pathway.

#### Clinical complexity indicators and Guest Seen

These work as on the CMHW dashboard (section 2.1), but Guest Seen counts contacts by all staff across the hub.

#### Guest demographics

Four panels break guests down by **Ethnicity**, **Age groups**, **Gender** and **Country of origin**. Each panel shows the largest groups and names the largest. Select a bar to open the guest list with that group chosen in the **Demographics** filter.

#### CPN involvement

| Tile | Select it to open |
| --- | --- |
| Guests with CPN involved | Guests marked "CPN involved" on Clinical Details |
| Initial assessments completed | Guests with a submitted CPN Part 1 assessment |
| CPN sessions · last 30 days | Guests with a CPN contact session in the last 30 days |
| Referred to CPN · last 30 days | Guests referred to the CPN in the last 30 days |

Below the tiles, a table lists guests with CPN involvement. It shows their status, CMHW, initial assessment, CPN sessions and last CPN contact. Select a row or name to open the record. **View all guests with CPN involvement** opens the full list.

#### Caseload per CMHW

One row per worker, busiest first. Each row shows assigned, active and urgent guests, overdue contacts and contacts in the last 30 days. A load bar compares the worker with the busiest one.

- Select a row or **View** to open the guest list filtered to that worker.
- Select the **Active** number to open that worker's active guests, or the **Urgent** number to open their urgent guests.
- **Full caseload report** opens Reports. Choose the **Caseload Reports** tab.

#### Outstanding team actions

The five soonest open scheduled contacts across the hub, with who they are assigned to and whether they are overdue. Select a row to open the guest. Select **view all actions** to open the Scheduled contacts screen.

#### Staff activity

The 15 most recent actions on guest records, in plain English, for example "Opened guest record", "Recorded a contact" or "Changed pathway". Each line shows who did it and when. Select the guest's name to open the record.

#### Data quality issues

| Row | What it counts |
| --- | --- |
| Missing pathway classification | Guests with no clinical pathway; they cannot become Active until resolved |
| Initial conversation not completed | Guests still New |
| Missing DIALOG baseline score | Guests with no DIALOG assessment |
| Guests automatically moved to Inactive | Guests moved to Inactive after 90 days without activity |

Select a row with a count above zero to open the guests affected.

## 3. Finding guests

### 3.1 The guest list

Select **Guest** in the menu. The list is sorted by surname and loads 50 guests at a time. More load as you scroll, or select **Load more**.

| Column | What it shows |
| --- | --- |
| Guest Name | Name and reference, for example G-1001 |
| Status | New, Active or Inactive, and an Urgent badge if flagged |
| Pathway | The guest's pathway: Mental Wellbeing, Clinical Support or Community Recovery |
| CMHW | The assigned worker |
| Last Activity | Date of the last recorded contact ("Today", "Yesterday" or a date) |
| Next Contact | Date of the earliest open scheduled contact |
| Actions | **Open** |

Select anywhere on a row, the name or **Open** to open the guest's record.

### 3.2 Search the list

Type in **Search guest by name, ID, phone, CMHW...**. The search matches:

- any part of a guest's first name, surname or full name
- a reference, typed as `G-1001` or `1001`
- a phone number, or part of one
- the name of the guest's assigned CMHW.

The list updates a moment after you stop typing.

### 3.3 Filters

| Filter | Options |
| --- | --- |
| Reset filters (the icon left of the filters) | Clears the search box and every filter |
| Pathway | Mental Wellbeing, Clinical Support, Community Recovery |
| Status | New, Active, Inactive |
| Urgent only | Shows only guests with the urgent flag; select again to turn off |
| Assigned CMHW | Type to search staff; select × to clear |
| Last Activity | Today, Last 7 days, Last 30 days |
| Demographics | Ethnicity, Age group, Gender, Country of origin |

To use the **Demographics** filter:

1. Select **Demographics**.
2. Choose one or more of **Ethnicity**, **Age group**, **Gender** and **Country of origin**.
3. Select **Apply**. Each choice appears as a chip. Select × on a chip to remove it, or **Clear all**.

Filters combine. For example, Status Active with Urgent only shows active guests who are urgent.

### 3.4 Lists opened from a dashboard or report

When you select a count on a dashboard or report, the guest list opens showing exactly the guests behind it.

- Status, worker and demographic counts set the matching filter in the toolbar.
- Other counts show a banner above the table, for example "Showing guests: SMI recorded · 12 guests" or "Showing guests: Clinical Support pathway".
- Select **Show all guests** on the banner to remove that condition. Any other filters stay on.
- Select the reset icon to clear everything.

### 3.5 Export the guest list

1. Search and filter the list to the guests you need.
2. Select **Export Guest**.
3. A CSV file downloads with up to 2,000 matching guests. It opens in Excel.

The file has each guest's name, date of birth, status, urgent flag, pathway and risk (High or Low). It also has the CMHW, registration date, last contact and next contact.

> **Warning:** The export contains personal data. Store it only in approved locations and delete it when you no longer need it.

## 4. Registering a guest

Select **Register New Guest** on the guest list. Registration has five steps, shown along the top: Demographics, Initial conversation, DIALOG, Pathway & allocation and Review.

- **Register & Continue** (step 1) and **Save & Continue** (steps 2 to 4) check the step and move on. Missing fields are marked in red.
- **Go Back** returns to the previous step. On step 1 it leaves registration.
- **Cancel** and **Back to Guest List** leave registration without saving.

> **Warning:** **Save Draft** does not store the registration. It only shows "DRAFT SAVED" with a time. Nothing is saved until you select **Submit** on the Review step, or **Register & schedule for later** on step 1. Finish registration in one sitting: leaving the page or being signed out loses everything entered.

### 4.1 Step 1: Demographics

Tell the guest that migration information will not be shared with third parties, such as the Home Office, without their consent. **Completed by** and **Date** are filled in for you.

| Field | Required | Notes |
| --- | --- | --- |
| First Name, Last Name | Yes | |
| Date of Birth | Yes | Must be in the past |
| Phone Number | Yes | |
| Ethnicity | Yes | Options come from Settings |
| Gender | No | |
| Address, Post Code | No | |
| Contact email | No | Must be a valid email address if entered |
| Referral source | Yes | GP referral, CMHT, Community organisation, Self-referral (the default), Family / carer, Hospital discharge |
| Referral type | Yes | Primary (the default) or Secondary |
| Secondary referral subcategory | For Secondary referrals | Options come from Settings |
| Consent | Yes | Tick "The guest has given consent for their data to be recorded and processed by the service." |

If your hub has added extra questions, they appear under **Additional information**. Some may be required.

Housing, employment, nationality, country of origin, language, emergency contact and GP details are not needed now. You complete them later on the guest's **Demographics** tab.

> **Tip:** Check the name, date of birth and contact details carefully. There is no screen to correct them after registration.

### 4.2 Step 2: Initial conversation

This form is completed once, at the first session. It is locked after submission and becomes the baseline clinical record.

| Section | Required fields | Other fields |
| --- | --- | --- |
| Session details | Date of session (today by default), Type of contact (Phone call by default) | Hub worker and Job title, filled in for you |
| Presenting problem | Prompt 1: Main concern and reason for coming. Prompt 2: Duration, daily impact, and any recent trigger or stressor | Prompt 3: Background. Prompt 4: The guest's own understanding and what they want |
| Mental health & psychiatric history | Summary for the MDT (3 to 5 sentences) | Previous diagnosis, diagnosis group, reported diagnosis, inpatient admission, family history |
| Physical health | None | Conditions, allergies, current medication |
| Risk screening | History of self-harm or suicide; history of risk to others; history of safeguarding concerns; Immediate escalation required?; Is the guest at immediate risk? | Comments, flags for the MDT, risk and safeguarding notes |
| Actions arising | Each action needs a description and a due date | Assigned to |
| Consent | Tick "The guest confirmed their consent for this conversation to be recorded in their clinical record." | |

- If **Immediate escalation required?** is a Yes answer, **Crisis notes** become required. Record the actions taken, who was notified and what was agreed.
- Use the prompts to guide a natural conversation. Record the guest's own words where you can.
- Prompt 1 is saved as the presenting problem. Everything else on this step is saved together as the conversation notes.

> **Warning:** Answering **Yes** to "Is the guest at immediate risk?" raises the urgent flag when you submit. So do Yes answers to the three history questions, a Yes to immediate escalation, and the flags for self-harm, psychosis, domestic abuse or child safeguarding.

### 4.3 Step 3: DIALOG

Score each of the 11 life areas from 1 (totally dissatisfied) to 7 (totally satisfied). Every area needs a score.

- **Need help?** (Yes or No) is optional for each area.
- EMHIP adds up the **Total score / 77**, the **Areas needing help** and the areas of **High concern** (a score of 3 or less).
- **Additional notes** are optional.

This becomes the guest's DIALOG baseline.

### 4.4 Step 4: Pathway & allocation

1. Choose the **MDT pathway recommendation**: Mental Wellbeing, Clinical Support or Community Recovery.
2. Tick **Practical support / Advice First Aid also needed?** if the guest needs help with housing, benefits, immigration or money.
3. Enter the **Next contact date** and choose the **Assigned CMHW**.

Mental Wellbeing and Clinical Support are one-to-one pathways. For these, the next contact date and the assigned CMHW are required.

### 4.5 Step 5: Review and submit

1. Check the summary. It shows the guest's details, the initial conversation, the DIALOG total, the pathway, the CMHW and the next contact date.
2. Select **Submit**.
3. A **Submission progress** list shows each part as Waiting, Saving…, Saved or Failed.
4. When every part is saved, the **Success!** screen shows the guest's reference, for example "Guest reference: G-1042".
5. Select **Go to Guest Workspace** to open the record on its Demographics tab, or **Back to Guest List**.

If a required field is missing, EMHIP says "Some required fields are missing — please complete the highlighted step before submitting." and opens that step.

If one part fails, EMHIP names it and stops. Select **Retry Submit**. Parts already saved are not repeated, so the guest is never registered twice.

### 4.6 What Submit creates

| Record | Where you find it |
| --- | --- |
| The guest, first New and then Active | Guest list |
| Answers to any additional questions | Overview tab |
| The initial conversation, locked | Initial Conversation tab |
| The clinical pathway, AFA flag and assigned CMHW | Record header and Pathway History tab |
| A scheduled contact on the next contact date | Scheduled contacts; Next Contact on the guest list |
| Each action arising | Actions & Reminders tab |
| The DIALOG baseline | DIALOG Scores tab |
| Ethnicity | Demographics tab |
| An **Initial review** item, if there was immediate risk or the pathway is Clinical Support | MDT Queue |
| A risk assessment, if risk screening found anything | Clinical Details tab |
| The urgent flag and an urgent episode, if a risk was flagged | Urgent Cases |

### 4.7 Register now and hold the conversation later

Use this when you can take the guest's details but cannot hold the initial conversation yet.

1. Complete step 1.
2. Select **Register & schedule for later**.
3. EMHIP registers the guest as **New** and shows the Success screen.

Later, open the guest and use the **Initial Conversation** tab (section 5.4). Record the DIALOG baseline on the **DIALOG Scores** tab (section 5.6).

## 5. Working with a guest record

Open a guest from the guest list, the top-bar search, a dashboard or any guest name.

### 5.1 The record header

The header shows the guest's name with chips for status, clinical pathway and any active risk flag. An urgent guest also has a chip such as "Urgent since 12 Sep 2026". Under the name you see the reference, registration date, last activity and assigned CMHW.

| Button | What it does | Who has it by default |
| --- | --- | --- |
| Back arrow | Returns to the previous screen | Everyone |
| **Add Contact** | Opens the Add Contact form (section 6) | CMHWs, CPNs, Hub Managers |
| **Raise Urgent Flag** | Opens Clinical Details with the risk assessment form ready (section 5.5) | Everyone |
| **Export Record** | Downloads the guest's full record (section 5.15) | Hub Managers |
| **Anonymise record** | Removes the guest's identifying details (section 5.16) | Administrators |

If the guest has open scheduled contacts, a banner says how many. Work them from the Scheduled contacts screen (section 9.3).

The tabs are Overview, Demographics, Initial Conversation, Clinical Details, DIALOG Scores, Pathway History, Care Plan, Contact History, CPN Record, Documents, Actions & Reminders and Notes. Hub Managers also see Access Log.

### 5.2 Overview tab

- **Tiles:** days since last activity, number of open scheduled contacts, and the DIALOG baseline score out of 77.
- **Personal snapshot:** date of birth, ethnicity, phone, housing, economic activity, referral type and email.
- **Pathway history:** current pathway, registration date, assigned CMHW and whether AFA support is needed.
- **Recent activity history:** the 10 most recent contacts. Select **View all** to open the Contact History tab.
- **Additional information:** any extra questions your hub has added. You can edit the answers if your role allows.

### 5.3 Demographics tab

**Personal details** were captured at registration and are read-only. Five further sections each show **Completed** or **Pending**, and each saves on its own.

| Section | Fields |
| --- | --- |
| Contact & housing | Housing status, living situation, occupational status |
| Identity, language & interpreter | Ethnicity, marital status, preferred language, interpreter needed |
| Migration & background | Nationality, country of origin |
| GP, NHS & PCN details | GP name, GP practice / PCN, NHS number |
| Emergency / additional contact | Name, phone, relationship |

#### Complete a demographics section

1. Select **Edit** on the section, or **Complete** beside it in the **Profile completion** card.
2. Fill in the fields.
3. Select **Save section**. "Saved" appears and the section shows Completed when every field is filled.

The **Profile completion** card shows the percentage complete. The **Relationship to other services** card shows service involvement from Clinical Details; select **Edit in Clinical Details** to change it. **Continue to Initial conversation** and **Go to DIALOG scores** move you on to the next part of the record.

> **Tip:** If a list such as Living situation is empty, its options have not been set up yet. Ask your Administrator.

### 5.4 Initial Conversation tab

Once the initial conversation is complete, this tab shows the locked record. It shows who held it and when, the presenting problem, the conversation notes and the pathway decision. It also shows whether consent was confirmed.

#### Record the initial conversation for a New guest

1. Open the **Initial Conversation** tab. It says the initial conversation has not been completed.
2. Select **Start Initial Conversation**.
3. Enter the **Presenting issues** and any **Notes**.
4. Answer **Immediate risk**: **Yes — immediate risk** or **No immediate risk**. This is required.
5. Choose the **Pathway agreed**. This is required. Tick the AFA box if practical support is also needed.
6. For Mental Wellbeing or Clinical Support, choose the **Named CMHW** and a **Next contact date**. The date cannot be in the past.
7. Select **+ Add action** for anything agreed. Each action needs a description and a due date.
8. Tick the box to confirm the guest's consent. This is required.
9. Select **Complete Initial Conversation**.

The guest becomes Active. The record is locked and cannot be edited. Submitting also allocates the pathway and CMHW, schedules the next contact and creates the actions. Immediate risk raises the urgent flag. Immediate risk or the Clinical Support pathway also adds an **Initial review** item to the MDT Queue.

### 5.5 Clinical Details tab

The tab shows the presenting problem, long-term and physical health conditions, mental health history, medication, current service involvement and the **Risk & complexity** card.

#### Update clinical details

1. Select **Edit details**.
2. Update the fields you need. They cover the presenting problem, health conditions, medication, mental health history, diagnosis groups and other services involved.
3. Tick or untick **Previous MH diagnosis**, **CPN involved**, **Trust involvement** and **SMI indicator**.
4. Select **Save details**.

These ticks feed the Clinical complexity indicators on the dashboards.

#### Record a risk assessment

1. In the **Risk & complexity** card, select **+ Record assessment**. **Raise Urgent Flag** in the header opens this form for you.
2. Tick any that apply: **Suicidal ideation**, **Self-harm**, **Risk to others**, **Severe deterioration**, **Safeguarding concern**.
3. Add **Notes**.
4. Select **Save assessment**.

If you tick at least one box, the guest gets the urgent flag and appears on Urgent Cases. The assigned CMHW is also sent an email, if your hub has turned this on.

Each assessment is kept as a new version. The card shows whether the latest one found a risk. A banner gives its version and date, for example "Last risk assessment: v3, 12 Sep 2026 — active risk flags".

> **Tip:** Recording a new assessment with no boxes ticked does not clear the urgent flag. Only resolving the urgent episode clears it (section 7.7).

### 5.6 DIALOG Scores tab

The first DIALOG assessment is the baseline. Later ones are reassessments. The **Score history** table compares the baseline with the latest score for each of the 11 areas, and the total out of 77.

#### Record a DIALOG reassessment

1. Select **Record new**.
2. Choose a score from 1 (worst) to 7 (best) for each area. Every score starts at 4.
3. Select **Save assessment**.

If the guest has no baseline yet, the first assessment you record becomes the baseline.

### 5.7 Pathway History tab

This tab shows the current pathway, every pathway change and the caseload allocation.

#### Change the clinical pathway

1. Select **Add New Pathway**.
2. Under **Select new pathway**, choose the new pathway. The current one cannot be chosen.
3. Enter the **Date of change**. It cannot be in the future.
4. Check **Assigned by**. It is set to you; change it to whoever authorised the change.
5. Enter the **Reason for change**.
6. Select **Change Pathway**.

The old pathway stays in the history. The change is permanent and appears in reports.

#### Reassign the CMHW

1. Under **Caseload allocation**, select **Reassign CMHW**.
2. Choose the **New CMHW**. This is required.
3. Enter the **Reason for reassignment**.
4. Select **Reassign CMHW**.

Every reassignment is logged with who made it, when and why.

### 5.8 Care Plan tab

A care plan records what the guest wants from their support, the arrangements agreed and the goals being worked towards.

#### Start a care plan

1. Select **Start care plan**.
2. Fill in **Plan summary**, **The guest's own words**, **Agreed support arrangements** and **Review due**.
3. Select **Add goal** for each goal. Give it a **Description** and choose a **Status**: Not started, In progress, Achieved or Discontinued. Add a **Target date** and a **Progress note** if useful.
4. Use the arrow buttons on a goal to move it up or down, or the remove button to delete it.
5. Select **Save care plan**.

Every goal needs a description. EMHIP says "Every goal needs a description. Remove any blank rows before saving." otherwise.

#### Update or close a care plan

1. To update it, select **Edit plan**, make your changes and select **Save care plan**.
2. To close it, select **Close plan**, then choose how it ended: **Completed** or **Superseded**.

A closed plan moves to **Previous care plans** and becomes read-only. You can then start a new one. A **Review overdue** chip appears when the review date has passed.

### 5.9 Contact History tab

This lists every contact recorded for the guest, newest first. Each shows the type (for example Phone call), the outcome, the date and time, and who recorded it. Select **Load more** to see older contacts.

### 5.10 CPN Record tab

This tab brings the guest's CPN work together.

- **CPN referral record:** who referred the guest and when, the reason and urgency, and who confirmed it at MDT. It shows the CPN allocated, the first CPN contact date and whether Part 1 is complete. It also shows the CMHW's rationale and any MDT note or decline reason.
- **CPN contacts logged:** each CPN contact, titled "Initial assessment" or "Contact session" with a number, with its assessment text and risk level.
- **CPN activity:** status, CPN, sessions logged and first and latest contacts.

Select **Add CPN contact** to open the Add Contact form. Turn on "Is this a CPN contact?" to log a CPN session (section 6.3).

### 5.11 Documents tab

All of a guest's documents are kept on this tab. Anything you upload here is filed on this guest automatically.

#### Upload a document

1. Select **Upload document**.
2. Drag a file onto the panel, or select **Browse files**. The panel shows the allowed file types and the size limit.
3. Check the **Title**. It is filled in from the file name. This is required.
4. Choose a **Category**. This is required.
5. Add a **Description**, **Tags** (press Enter after each) and a **Retain until** date if needed. Leave Retain until blank to use the hub's default retention period.
6. Answer any **Additional information** questions.
7. Select **Upload document**. A progress bar shows the upload.

The document is stored as version 1 and "Document uploaded." appears.

#### Work with a document

| To | Do this | Who can by default |
| --- | --- | --- |
| Download it | Select **Download** on its row | Everyone |
| See details and versions | Select the title, or the three-dot menu and **View details & versions** | Everyone |
| Change title, category or tags | Three-dot menu, **Edit details** | CMHWs, CPNs, Hub Managers |
| Replace the file | Open the details, then **Upload new version** | CMHWs, CPNs, Hub Managers |
| Stop others replacing it while you work | Open the details, then **Check out**; **Check in** when done | CMHWs, CPNs, Hub Managers |
| Delete it | Three-dot menu, **Delete**, then **Move to recycle bin** | Hub Managers |
| Restore it | Select **Recycle bin**, then **Restore** | Hub Managers |
| Remove it for good | In the recycle bin, **Permanently delete**, then type DELETE | Administrators |

Every version stays in the version history and can be downloaded. A reason for deleting is optional.

### 5.12 Actions & Reminders tab

Actions are tasks agreed for the guest. They also come from the initial conversation and from Add Contact.

#### Add an action

1. Select **Add Actions**.
2. Describe the **Action**. This is required.
3. Set the **Due date**. It starts as today.
4. Choose who it is **Assigned to**, or leave it unassigned.
5. Select **Add action**.

#### Complete, edit or delete an action

- Tick the box beside an action to complete it. It moves to **completed actions**. Tick it again to reopen it.
- Select **Edit** to change it, then **Save action**.
- Select **Delete** to remove it.

Due dates show "overdue" in red, and "due soon" when they are three days away or less.

> **Warning:** **Delete** removes an action straight away, without asking you to confirm.

### 5.13 Notes tab

#### Casework notes

Every contact recorded with Add Contact is filed here as a casework note.

- Select a note to expand it. You see the Situation, Background, Assessment and Recommendation, any actions, attachments and flags.
- Drafts show a **Draft** badge. Select **Resume** to finish one, or **Discard** to delete it. Submitted notes cannot be deleted.
- **Add casework note** opens the Add Contact form.

#### Quick notes

1. Type a short note in **Note**.
2. Choose a **Colour**: Yellow, Green, Orange or Purple.
3. Tick **Pin to Overview** to pin it.
4. Select **Add note**.

Select **Pin** or **Unpin** on any quick note. Pinned notes appear under **Crisis Actions Taken** in the Urgent Case Details panel.

### 5.14 Access Log tab (Hub Managers)

This tab shows who has viewed, changed, downloaded or exported this guest's record, newest first. It lists up to 300 events, each with when, who, the event and details.

Events are in plain English, for example "Opened guest record" or "Viewed casework notes". For changes, it lists which fields changed but never their values.

### 5.15 Export a guest's full record (Hub Managers)

Use this for a subject access request.

1. Open the guest's record.
2. Select **Export Record**.
3. A file named like `guest-record-G-1042.json` downloads. It holds the complete record, including its access log.

The export is recorded on the guest's Access Log. Handle the file as confidential.

### 5.16 Anonymise a record (Administrators)

**Anonymise record** permanently removes a guest's identifying details and hides the record. It cannot be undone. Only Administrators have it by default. Section 8.3 of the Administrator Guide explains how to use it.

## 6. Recording a contact (Add Contact)

Every contact with a guest is recorded with the **Add Contact** form. It uses the SBAR structure: Situation, Background, Assessment and Recommendation.

You can open the form from:

- **Add Contact** in a guest's record header
- **Add casework note** on the Notes tab, or **Resume** on a draft
- **Add CPN contact** on the CPN Record tab
- **Add contact** on a row or in the details panel on Urgent Cases.

### 6.1 Record an ordinary contact

1. Open the form. It shows the guest's name at the top.
2. Under **Select contact type**, choose **CASEWORK** (selected to start with), **ACTIVITY**, **HOSPITALITY** or **AFA**.
3. Choose the **Contact method**: Phone call, In person, Video call, Text message or Email. This is required.
4. Check the **Date**. It is today by default. **Logged by** is filled in for you.
5. Write the **Situation**: what is happening now.
6. Write the **Background**, and any changes in medication, physical health, social circumstances or other services.
7. Write your **Assessment**. This is required to submit.
8. Write the **Recommendation**: what needs to happen next.
9. Under **Risk update**, choose **YES, HIGH RISK** or **NO RISK DETECTED** (the default). Add **Risk notes** if needed.
10. Add actions, attachments, a next contact date or MDT and CPN requests as needed (sections 6.4 to 6.7).
11. Select **Submit contact note**.

> **Warning:** Choosing **YES, HIGH RISK** records the risk on the note but does not raise the urgent flag. To raise it, use **Raise Urgent Flag** and record a risk assessment (section 5.5).

### 6.2 Who sees the CPN option

The switch **Is this a CPN contact?** appears only for staff who log CPN contacts. By default that is the CPN role. CMHWs and Hub Managers see the contact type choices instead.

### 6.3 Record a CPN contact

1. Open the form and turn on **Is this a CPN contact?**
2. Choose the **Contact method** and check the **Date**.
3. Under **CPN session type**, choose:
    - **Initial assessment** for the first CPN contact. This is Part 1, written once per guest.
    - **Contact session** for every CPN contact after that.
4. Complete the form for that session type, as described below.
5. Select **Submit contact note**.

#### Part 1: the initial assessment

Part 1 is completed once, at the first CPN contact. After it is submitted, choosing **Initial assessment** shows it read-only, with a note to record a contact session instead. It cannot be changed or submitted again.

| Section | Required to submit |
| --- | --- |
| 1. Method of assessment | Method of assessment |
| 2. Diagnosis and medication | Reason for referral to CPN; Referred by |
| 3. Past psychiatric history | None |
| 4. Personal and family history | None |
| 5. Mental state examination | Appearance and behaviour, Speech, Mood (subjective and objective), Affect, Thoughts, Perceptions |
| 6. Substance use | None |
| 7. Social circumstances | None |
| 8. Mental capacity | Capacity to consent (Yes - has capacity by default) |
| 9. Risk assessment | Overall risk rating; each of the nine risk areas is rated Not applicable, Low, Medium or High |
| 10. Clinical impression and plan | Clinical formulation; Recommended clinical plan; Contact frequency; Next appointment date |

The lists for method, others present, referred by, diagnosis and contact frequency are set up by your Administrator.

Submitting Part 1 files it on the record, logs a contact and schedules the next appointment date as a scheduled contact. You can save Part 1 as a draft and come back to it until you submit it.

#### Contact session

A contact session is an SBAR note for each CPN contact after Part 1. Refer back to Part 1 for the baseline and record only what is new or has changed.

The fields are the same as an ordinary contact (section 6.1), except there is no contact type. **Assessment** and **Recommendation** are both required to submit. When submitted, the session is numbered, for example "Contact session 3".

### 6.4 Actions arising

1. Select **Add new action from this session**.
2. Enter a **Description** and a **Due date**. An action with a description must have a due date.
3. Choose who it is **Assigned to**. If you leave it blank, it is assigned to you.
4. Select **Remove** to drop a row.

Each action becomes a guest action on the Actions & Reminders tab when you submit. Blank rows are ignored.

### 6.5 Attachments

1. Select **Attach document**, or drag files onto the **Attachments** area. You can add several files at once.
2. Each file uploads with a progress bar. If the note is new, EMHIP first saves it as a draft, so choose the contact method and date before attaching.
3. Select **Remove** to take a file off the note before you submit.

Attached files are also stored on the guest's Documents tab. They are locked with the note once it is submitted. Attachments cannot be added to a Part 1 initial assessment.

### 6.6 Next contact date

Enter a **Next contact date** to schedule the next contact with this guest. When you submit, it becomes a scheduled contact assigned to you.

### 6.7 MDT discussion and CPN referral

Two switches near the end of the form send the guest to the Hub Manager's MDT queue when you submit.

- **Add this guest for MDT discussion** creates a discussion request. Enter the **Reason for requesting MDT discussion** (required) and any **Detail**. It does not refer the guest to the CPN.
- **Refer this guest to the CPN** creates a CPN referral. Choose the **Primary reason for CPN referral** (required) and the **Urgency**: Routine (discuss at next MDT) or Urgent (Hub Manager today). Add a **Brief rationale** of 3 to 4 sentences.

A CPN referral does not bypass the MDT. The CPN is allocated only when the Hub Manager confirms it (section 8). A guest can have only one waiting item of each kind; a second request of the same kind is not added.

### 6.8 Save as draft or submit

- **Save as draft** keeps the note so you can finish it later. A draft needs only the contact method and the date. "Draft saved at" shows the time. Resume it from the Notes tab.
- **Submit contact note** files the note on the clinical record. EMHIP checks the required fields first and shows a message if something is missing, for example "Choose a contact method before saving."

A submitted note cannot be changed or deleted. Close the form with the × at the top.

> **Warning:** Clicking outside the form does not close it, but closing it with the × does, and anything not saved is lost. Save as a draft first if you need to look at something else.

### 6.9 What submitting creates

| Record | Where you find it |
| --- | --- |
| The casework note | Notes tab (CPN sessions also on the CPN Record tab) |
| A contact | Contact History tab, Overview tab and the Contact History screen |
| Each action arising | Actions & Reminders tab |
| A scheduled contact, if you set a next contact date | Scheduled contacts; guest list Next Contact |
| A discussion request, if you turned on MDT discussion | MDT Queue |
| A CPN referral, if you turned on the referral | MDT Queue and CPN Record tab |
| For Part 1: the initial assessment and a scheduled contact for the next appointment | CPN Record tab and Scheduled contacts |

When you submit from a guest's record, the form closes and the **Notes** tab opens to show the new note.

## 7. Urgent cases

### 7.1 How a guest becomes urgent

A guest gets the urgent flag when:

- someone records a risk assessment on Clinical Details with at least one risk ticked (**Raise Urgent Flag**)
- the initial conversation records immediate risk, at registration or on the Initial Conversation tab
- risk screening at registration finds a risk (section 4.2).

The flag opens an **urgent episode**. The guest appears on Urgent Cases for everyone within moments, and the assigned CMHW is emailed if your hub has turned this on. A guest has only one open episode at a time.

### 7.2 The 72-hour window

An urgent guest must be contacted within 72 hours of the flag being raised. The countdown starts when the flag is raised. After 72 hours the case shows as overdue until someone resolves the episode, even if contacts have been logged.

### 7.3 The Urgent Cases screen

Select **Urgent Cases** in the menu. The number beside it is the count of open cases.

- A red banner appears when cases are overdue. Select **View now** to scroll to them.
- **Live** beside the title means new cases appear and resolved ones disappear without refreshing. If it shows another word, such as Reconnecting, refresh the page.
- **Tiles:** Active Urgent Cases, Contact overdue, Within 72-hour window and Resolved this month.
- **Filters:** **Risk Level** (one of the five risk types), **Assigned CMHW** and **Overdue Only**.

Each open case shows the guest's name and reference, the hours left or overdue and the contact deadline. It also shows the risk types, the CMHW and when the flag was raised. Its buttons are:

- **Open Guest**: opens the guest's record
- **Add contact**: opens the Add Contact form for that guest
- **Open Crisis Episode**: opens the urgent episode record (section 7.8).

Select anywhere else on the case to open the **Urgent Case Details** panel.

Resolved cases are listed below the open ones. Each shows when it was resolved, whether that was within 72 hours, any CMHT team and the resolution note. Select a resolved case or **View Episode** to open its episode record.

Select **Export** to download the cases currently shown as a CSV file.

### 7.4 The Urgent Case Details panel

The panel shows:

- a **72-hour countdown** with the deadline
- the assigned CMHW, when the flag was raised, whether the CMHT was notified and which team, whether contacts have been logged, and the status
- the risk types
- **Crisis Actions Taken**: the guest's pinned notes
- the **Episode timeline**: the flag, any escalation and each contact since the flag.

Its buttons are **Add contact**, **Open full episode record**, **Mark episode as resolved**, **Escalate to CMHT** and **Open full guest record**.

### 7.5 Add a crisis note

1. In the details panel, select **Add Crisis Note**.
2. Describe the crisis action taken.
3. Select **Save note**.

The note is saved as a pinned note on the guest and appears under Crisis Actions Taken.

### 7.6 Escalate to the CMHT

1. In the details panel, select **Escalate to CMHT**.
2. Enter the **CMHT team to escalate to**, for example Crisis Resolution Team.
3. Choose the **Reason for escalation**:
    - 72 hour window expired - no contact
    - Risk level has increased
    - Guest unreachable - welfare concern
    - Clinical need beyond hub capacity
    - Safeguarding concern.
4. Choose the **Urgency level**: Emergency, Urgent (the default) or Routine.
5. Write the **Escalation notes**: clinical context, contacts attempted and the current risk.
6. Select **Send escalation**.

All four fields are required. The escalation is added to the episode timeline and the details panel shows "CMHT notified: YES".

> **Warning:** EMHIP records the escalation but does not contact the CMHT for you. Contact the team by your usual route as well.

### 7.7 Resolve an urgent episode

1. In the details panel or the episode record, select **Mark episode as resolved**.
2. Write a **Resolution note**. It is optional, but it becomes part of the permanent record.
3. Under **Pathway after resolution**, keep the current pathway or choose a new one.
4. Enter a **Next contact date** if one was agreed. It cannot be in the past.
5. Record any change in session frequency, for example "Yes — weekly CPN input added".
6. Tick **Guest was admitted as an inpatient during this episode** if that happened.
7. Select **Mark as resolved**.

Resolving:

- closes and locks the episode
- clears the urgent flag; the guest keeps their status (New, Active or Inactive)
- adds any pathway change to the Pathway History tab
- schedules the next contact for the guest's CMHW
- removes the case from Urgent Cases for everyone and lists it under resolved cases.

### 7.8 Urgent episode records

The episode record is the full account of one urgent episode. Open it with **Open Crisis Episode**, **Open full episode record**, **View Episode** or by selecting a resolved case.

- **Episode tabs** (Episode 1, Episode 2 and so on) switch between a guest's episodes. A dot marks the open one.
- The banner says whether the episode is open or resolved. An open episode has **Escalate to CMHT** and **Mark episode as resolved** buttons.
- **Episode overview:** the pathway at the time of the flag, the CMHW, who raised the flag and when, and the deadline. It also shows who resolved it and when, and any CMHT team.
- **Crisis action notes at intake:** the risk types and notes from the assessment that raised the flag.
- **Full episode timeline**, and for resolved episodes the **Resolution note** and **Pathway re-entry decision**.
- **Episode outcome:** whether it was resolved within 72 hours, duration, contacts logged, CMHT escalation and inpatient admission.
- **System audit trail:** the recorded steps of the episode.

#### Export an episode record

1. Open the episode record.
2. Select **Export Record**.
3. A text file downloads, named like `urgent-episode-G-1042-episode-1.txt`.

The export is recorded on the guest's Access Log.

## 8. MDT queue (Hub Managers)

Select **MDT Queue** in the menu. The number beside it is the count of items waiting. The chips at the top filter by type: **All**, **CPN referrals**, **Initial review** and **Discussion**.

| Item type | Where it comes from | Actions |
| --- | --- | --- |
| CPN referral | **Refer this guest to the CPN** in Add Contact | **Confirm assign CPN**, **Decline with reason** |
| Initial review | An initial conversation with immediate risk, or allocated to Clinical Support | **Mark as discussed**, **Decline with reason** |
| Discussion request | **Add this guest for MDT discussion** in Add Contact | **Mark as discussed**, **Decline with reason** |

Each item shows the guest's name, reference, status, pathway and CMHW, the reason and details, who raised it and when, and the urgency. Urgent items show an **Urgent** badge. Select **Open Guest** to open the record on the CPN Record tab (CPN referrals) or the Notes tab (other items).

### 8.1 Confirm a CPN referral

1. Select **Confirm assign CPN**.
2. Choose the **Assigned CPN**. This is required.
3. Add a **Confirmation note** for the CPN handover, if needed.
4. Select **Confirm CPN assignment**.

Confirming allocates the CPN and marks the guest as CPN involved. The guest's CPN Record tab shows the confirmation, and CPN activity is tracked separately in reports.

> **Tip:** The staff list in **Assigned CPN** includes everyone in the hub. Check you have chosen a CPN.

### 8.2 Decline an item

1. Select **Decline with reason**.
2. Choose the **Reason for declining**. This is required.
3. Add **Additional context** for the CMHW, if needed.
4. Select **Decline referral**.

A declined CPN referral returns the guest to CMHW-only support. The reason shows on the CPN Record tab.

### 8.3 Mark an item as discussed

1. Select **Mark as discussed**.
2. Write the **MDT note**: what the team agreed. This is required.
3. Select **Mark as discussed**.

### 8.4 Reviewed items

Select **Show** under **Reviewed** to see confirmed, declined and discussed items, newest first. They form the permanent MDT record.

## 9. Contact History and Scheduled contacts

### 9.1 The Contact History screen

Select **Contact History** in the menu. It lists guests who have contacts recorded, with the most recently contacted first. Each row shows the guest's status, reference, pathway and CMHW, a count of each contact type and the last contact date.

- **Tiles:** Total contacts (and guests contacted), Casework, Activity, and AFA & Hospitality.
- **CPN activity:** a separate section with CPN contacts, sessions, initial assessments and guests seen by the CPN. Select **Show CPN contacts only** to list only guests with CPN contacts.
- **Search** matches a guest's name or reference.
- **Contact type:** All contacts, Casework, Activity, Hospitality, AFA or CPN contacts.
- **My caseload** limits the screen to guests assigned to you. It is on by default for CMHWs and CPNs, and off for Hub Managers. With it off, you can choose a worker in **All CMHW**.
- **Period:** All dates, Last 7 days, Last 30 days or Last 90 days. The tiles follow the period and caseload choice.
- The reset icon clears the search and filters.

Select **View Note** to open the guest's Notes tab, or **Open** (or the row) to open their Contact History tab. The list shows 10 guests a page; use **Prev** and **Next**. Select **Export** to download the filtered list, up to 2,000 guests, as a CSV file.

### 9.2 A guest's own contact history

Each guest's contacts are listed on the **Contact History** tab of their record (section 5.9).

### 9.3 Scheduled contacts

A scheduled contact is a contact planned for a date. EMHIP creates them from:

- the next contact date at registration or the initial conversation
- the next contact date in Add Contact
- the next appointment date in a CPN Part 1
- the next contact date when resolving an urgent episode
- **Schedule contact** on the Scheduled contacts screen.

#### Open the Scheduled contacts screen

The screen has no menu item. Hub Managers open it with **view all actions** in Outstanding team actions on the dashboard.

CMHWs and CPNs work scheduled contacts from their dashboard: the tiles, the Filter contacts table and **Actions pending today**.

#### Read the list

- A red banner shows how many scheduled contacts are overdue. Select **View now** to scroll to them.
- **Tiles:** Due today, Overdue, Due this week and Assigned to you.
- **Search** by guest name or assignee.
- **Filters:** **Status** (Scheduled, Overdue, Completed, Cancelled), **All Workers**, **Date Range** (Today, This week, This month) and **Overdue Only**.
- Each row shows the guest, the reference, the status, the time left or overdue, the due date and the assignee.
- The list shows five at a time, soonest first. Select **Next** to load more.

> **Tip:** The tiles, search and most filters work on the rows loaded so far. Select **Next** until the list is complete before relying on them.

#### Schedule a contact

1. Select **Schedule contact**.
2. Search for and choose the **Guest**.
3. Set the **Due date**.
4. Choose the **Assignee**. It starts as you.
5. Add **Notes** and any additional information.
6. Select **Save**.

A guest, due date and assignee are required.

#### Record a contact that has happened

1. On the row, select **Record contact**. Or select **Schedule contact** and then the **Log completed contact** tab.
2. Choose the **Contact type** and the **Outcome**: Successful, No answer, Left message, Declined or Rescheduled.
3. Check **Occurred at**. This is required.
4. Add **Notes**.
5. Select **Save**.

The row shows "Contact logged" with the date.

#### Mark a scheduled contact complete

Select the tick button on the row (**Mark complete**), or **Mark done** on the CMHW dashboard. The status changes to Completed.

> **Warning:** Recording a contact does not complete the scheduled contact. Mark it complete as well, or it stays open and later shows as overdue.

Assignees receive an email listing their overdue scheduled contacts, if your hub has turned this on.

## 10. Reports

Select **Reports** in the menu to open Reports & Analytics. Everyone can view reports by default. Only Hub Managers and Administrators can export them.

The tabs are Overview, Guest Report, Pathway Analytics, Caseload Reports, DIALOG Outcomes, Data Quality, CPN Activity and Export History. On a narrow screen, arrows at the ends of the tab bar show more tabs.

### 10.1 Set the date range

The **Overview** and **CPN Activity** tabs use a date range. It starts as the last six months.

1. Choose the **From** and **To** dates.
2. Select **Apply**.

The other tabs always show the current position.

### 10.2 Overview

- **Tiles:** Total guests, New, Active guests, Inactive and Urgent cases.
- **DIALOG outcome metrics:** total assessments, baselines, reassessments, average score change and guests with no reassessment yet.
- **Pathway distribution:** how many guests are on each of the three pathways now (not limited by the date range).
- **Guest registrations over time:** new registrations each month.
- **Guest demographics:** an ethnicity breakdown.
- **Referral sources:** the share of guests from each source.
- **Contact activity:** guests seen, total contacts recorded, scheduled contacts due and urgent flags raised in the period.

### 10.3 Guest Report

A searchable table of guests with their pathway, last activity and status.

- Use **Search by guest name**, and filter by **All Status**, **All Pathway**, **All CMHW** and **All Dates**. All Dates filters by last activity in the last 7, 30 or 90 days.
- Select **Filters** to choose **Ethnicity**, **Age group**, **Gender** and **Country of origin**, then **Apply**. Each choice shows as a chip; **Clear all** removes them.
- Select **Open** to open a guest's record. Use **Prev** and **Next** to page through.

### 10.4 Pathway Analytics

One row for each clinical pathway: guests, active, urgent, inactive, guests needing AFA support and the average DIALOG score.

### 10.5 Caseload Reports

- **Tiles:** total CMHW staff with guests, average caseload, highest caseload and overdue contacts.
- **Caseload per CMHW:** assigned, active, urgent, overdue contacts, contacts in the last 30 days and a load bar for each worker.
- Select **View** on a row to open the Guest Report filtered to that worker.

### 10.6 DIALOG Outcomes

- **Tiles:** Baselines recorded, Reassessments (with the percentage of guests with a baseline), Avg score change (baseline against most recent) and Missing assessments (no reassessment yet).
- **DIALOG score trend:** the average total score out of 77 each month.
- **Outcome dimensions:** a chart comparing the baseline and most recent average for each of the 11 areas.
- **Average DIALOG scores by domain:** baseline, most recent and change for each area.

#### Filter DIALOG outcomes by demographics

1. Select **Demographics** in the bar at the top of the tab.
2. Choose one or more of **Ethnicity**, **Age group**, **Gender** and **Country of origin**.
3. Select **Apply**.

Every figure on the tab is recalculated for that group. "Showing:" names the group and how many guests are in it. A warning appears if fewer than five guests in the group have a reassessment, because averages can then move on a single score. The same group is used for the DIALOG outcomes sheet of the Excel export.

### 10.7 Data Quality

The tab shows how many guests were checked and, for each check, how many guests are affected and what share of all guests that is.

| Check | What it finds |
| --- | --- |
| No demographics recorded | Guests with no Demographics tab record |
| Initial conversation not completed | Guests still New |
| No DIALOG baseline assessment | Guests with no DIALOG assessment |
| No pathway allocated | Guests with no clinical pathway |
| No CMHW assigned | Guests with no named worker |
| No contact in the last 90 days | Active guests with no contact for 90 days |
| No referral source recorded | Guests with no referral source |
| Due for retention review | Guests with no activity for longer than the retention period (20 years by default) |

Select **View guests** on a row to open the guests affected.

### 10.8 CPN Activity

- **Tiles:** guests seen by the CPN in the period, active CPN caseload, new CPN referrals and referrals confirmed at MDT (with the number pending review).
- **CPN referral pipeline:** new referrals requested, confirmed at MDT, declined at MDT and pending review, with the average days from referral to first CPN contact. These are internal referrals.
- **CPN sessions:** CPN contacts in the period, distinct guests seen and referrals declined.
- **Guests currently on CPN caseload:** pathway, referral date, CPN, number of CPN contacts, last CPN contact and next contact. Select **Open** to go to the guest's CPN Record tab.

### 10.9 Export History

A list of reports already exported, with the report, the period, when it was exported and by whom.

### 10.10 Export to Excel or CSV (Hub Managers)

**Export to Excel** downloads a workbook for the applied date range. It has seven sheets: Summary, Demographics, Referral sources, Pathways, Caseload, DIALOG outcomes and Data quality.

1. Set and apply the date range on the Overview tab.
2. If needed, set a demographic group on the DIALOG Outcomes tab.
3. Select **Export to Excel**.

To choose a different period, or to download a CSV file:

1. Select **Export CSV**.
2. Set the **From** and **To** dates under **Reporting period**.
3. Select **Download CSV** or **Export to Excel**.

The CSV file has one row per guest registered in the period. Each row gives the guest's G-number, name, pathway, status, registration date, ethnicity, age group, gender, country of origin, referral source and referral type. Demographics and referral sources are included in every export.

> **Warning:** Exports contain guest information. Store them only in approved locations.

## 11. Quick reference

The "Who can" column shows the built-in roles. Your Administrator may have changed them.

| I want to… | Where | Who can |
| --- | --- | --- |
| Find a guest | Top-bar search, or Guest | Everyone |
| Register a guest | Guest, **Register New Guest** | CMHW, CPN, Hub Manager |
| Hold a postponed initial conversation | Guest record, Initial Conversation tab | CMHW, CPN, Hub Manager |
| Complete demographics | Guest record, Demographics tab | CMHW, CPN, Hub Manager |
| Record a contact | Guest record, **Add Contact** | CMHW, CPN, Hub Manager |
| Record a CPN assessment or session | **Add Contact**, CPN switch on | CPN |
| Refer a guest to the CPN | **Add Contact**, **Refer this guest to the CPN** | CMHW, CPN, Hub Manager |
| Ask for MDT discussion | **Add Contact**, **Add this guest for MDT discussion** | CMHW, CPN, Hub Manager |
| Record a risk assessment | Guest record, **Raise Urgent Flag** | CMHW, CPN, Hub Manager |
| Update clinical details | Guest record, Clinical Details tab | CMHW, CPN, Hub Manager |
| Record a DIALOG reassessment | Guest record, DIALOG Scores tab, **Record new** | CMHW, CPN, Hub Manager |
| Change the clinical pathway | Guest record, Pathway History tab, **Add New Pathway** | CMHW, CPN, Hub Manager |
| Reassign the CMHW | Guest record, Pathway History tab, **Reassign CMHW** | CMHW, CPN, Hub Manager |
| Start or close a care plan | Guest record, Care Plan tab | CMHW, CPN, Hub Manager |
| Add or complete an action | Guest record, Actions & Reminders tab | CMHW, CPN, Hub Manager |
| Add a quick note | Guest record, Notes tab | CMHW, CPN, Hub Manager |
| Upload a document | Guest record, Documents tab | CMHW, CPN, Hub Manager |
| Delete or restore a document | Guest record, Documents tab | Hub Manager |
| See who opened a record | Guest record, Access Log tab | Hub Manager |
| Export a guest's full record | Guest record, **Export Record** | Hub Manager |
| Anonymise a record | Guest record, **Anonymise record** | Administrator |
| Act on an urgent case | Urgent Cases, then select the case | CMHW, CPN, Hub Manager |
| Escalate an urgent case to the CMHT | Urgent Case Details, **Escalate to CMHT** | CMHW, CPN, Hub Manager |
| Resolve an urgent case | Urgent Case Details, **Mark episode as resolved** | CMHW, CPN, Hub Manager |
| Export an urgent episode record | Episode record, **Export Record** | CMHW, CPN, Hub Manager |
| Confirm or decline a CPN referral | MDT Queue | Hub Manager |
| Record an MDT discussion | MDT Queue, **Mark as discussed** | Hub Manager |
| See contacts across the hub | Contact History | Everyone |
| Schedule a contact | Scheduled contacts, **Schedule contact** | CMHW, CPN, Hub Manager |
| Mark a scheduled contact done | Dashboard **Mark done**, or Scheduled contacts | CMHW, CPN, Hub Manager |
| View reports | Reports | Everyone |
| Export reports to Excel or CSV | Reports, **Export to Excel** or **Export CSV** | Hub Manager |
| Export the guest list | Guest, **Export Guest** | Everyone |
| Reset or change your password | Sign-in page, **Forgot password?** | Everyone |
| Manage staff, roles or settings | Administrator Guide (document 04) | Administrator |

## 12. Glossary

| Term | Meaning |
| --- | --- |
| Access Log | The list of who viewed, changed or exported a guest's record |
| Action | A task agreed for a guest, with a due date and an owner |
| AFA | Practical support, such as advice on housing, benefits, immigration or money. It is a flag on the guest and a contact type. Registration calls it "Advice First Aid"; the Initial Conversation tab calls it "Advice, Financial & Advocacy" |
| Baseline | A guest's first DIALOG assessment |
| Care plan | The guest's goals and the support agreed with them |
| Casework note | The note Add Contact writes for each contact |
| Clinical pathway | Mental Wellbeing, Clinical Support or Community Recovery |
| CMHT | Community mental health team: the team a hub escalates urgent cases to |
| CMHW | Community Mental Health Worker |
| Contact | Any recorded interaction with a guest |
| Contact session | A CPN contact after the Part 1 initial assessment |
| CPN | Community Psychiatric Nurse |
| DIALOG | A scale of 11 life areas, each scored 1 to 7, with a total out of 77 |
| G-number | A guest's reference, for example G-1001 |
| Guest | A person supported by the hub |
| Hub Manager | The manager of a hub, who sees the whole hub and runs the MDT queue |
| Inactive | The status of a guest with no activity for 90 days |
| Initial conversation | The first session with a guest, which makes them Active |
| MDT | Multi-disciplinary team |
| MSE | Mental state examination, section 5 of the CPN Part 1 |
| Part 1 | The CPN initial clinical assessment, done once per guest |
| Reassessment | Any DIALOG assessment after the baseline |
| SBAR | Situation, Background, Assessment, Recommendation: the structure of every contact note |
| Scheduled contact | A contact planned for a date and assigned to someone |
| SMI | A yes/no indicator on the Clinical Details tab, counted on the dashboards |
| Urgent episode | The record of one urgent flag, from raising it to resolving it |
| Urgent flag | A marker that a guest needs contact within 72 hours because of risk |

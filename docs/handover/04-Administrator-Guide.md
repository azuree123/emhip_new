# EMHIP Administrator Guide

_Version 1.0 · 30 September 2026 · For: system administrators and Hub Managers_

This guide explains how to set up and look after EMHIP at [emhip.brainshub.co.uk](https://emhip.brainshub.co.uk). It covers staff accounts, roles and permissions, every setting, the drop-down lists and extra form fields, importing old records, document housekeeping and your data-protection duties. Each statement was checked against the software released on 30 September 2026. Where a setting does not yet do what its label suggests, the guide says so.

## About this guide

- Text in **bold** is a button, field, tab or menu item exactly as it appears on screen.
- Text in `code` is something you type, a value in a file, or a permission name as the role editor shows it.
- Guests are the people the hub supports. A guest with the status **Inactive** has had no recorded activity for a while.
- A contact is any recorded interaction with a guest. Planned contacts are listed on the **Scheduled contacts** screen.
- Most tasks in this guide need the Admin role. Hub Managers can read settings and handle subject-access exports, but cannot change settings or accounts unless an Admin grants that.
- Everyday screens (registering guests, Add Contact, urgent cases) are covered in the User Guide (document 02). Server tasks such as backups and restarts are in the Deployment and Operations Runbook (document 06).

### Where the admin screens are

The left-hand menu has three headings: OVERVIEW, CASE MANAGEMENT and ADMIN. The admin screens sit under ADMIN. The gear icon in the top bar also opens **Settings**. A menu item appears only when the signed-in person holds the permission it needs.

| Menu item | Heading | Needs | CMHW | CPN | Hub Manager | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| **Dashboard** | OVERVIEW | Nothing | Yes | Yes | Yes | Yes |
| **Guest** | OVERVIEW | `guests.view` | Yes | Yes | Yes | Yes |
| **Urgent Cases** | CASE MANAGEMENT | `urgentcases.view` | Yes | Yes | Yes | Yes |
| **MDT Queue** | CASE MANAGEMENT | `mdt.manage` | | | Yes | Yes |
| **Contact History** | CASE MANAGEMENT | `guests.view` | Yes | Yes | Yes | Yes |
| **Hub Workers** | ADMIN | `admin.manageusers` | | | | Yes |
| **Roles & Permissions** | ADMIN | `admin.manageroles` | | | | Yes |
| **Reports** | ADMIN | `reports.view` | Yes | Yes | Yes | Yes |
| **Settings** | ADMIN | `settings.view` | | | Yes | Yes |

Two screens are not in the menu but still work for anyone with the right permission:

- **Documents**, the hub-wide document register, at `/documents`. It needs `documents.view`. It was taken out of the menu at the customer's request; see section 7.
- **Scheduled contacts** at `/followups`. It needs `followups.view`. Staff reach it from a link on the Hub Manager dashboard and from the overdue-contacts email.

Anyone holding `dashboard.hubmanager.view` sees the Hub Manager dashboard. Everyone else sees the CMHW dashboard.

## 1. Getting started

### 1.1 The bootstrap administrator

EMHIP has no self-registration. The very first account is created automatically when the system starts with no user accounts at all. Its sign-in email and password come from two configuration keys on the server: `Bootstrap:AdminEmail` and `Bootstrap:AdminPassword`. On the production server these are set in the server's environment file as `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Ask whoever installed the system for the values.

The account is called **System Administrator** and holds the Admin role. Changing the two keys later has no effect, because the account is only created when there are no users.

> **Warning:** The software contains a placeholder default password for this account. Treat the bootstrap password as known to others until you have changed it.

#### Sign in for the first time

1. Open [emhip.brainshub.co.uk](https://emhip.brainshub.co.uk).
2. Enter the bootstrap email and password.
3. Select **Sign in**. The Hub Manager dashboard opens.

#### Change the bootstrap password straight away

EMHIP has no "change my password" screen, so use the admin reset instead.

1. Open **Hub Workers**.
2. On the **System Administrator** row, select **Reset password**.
3. Enter a new password that meets the rules in section 2.6.
4. Select **Reset**.
5. Sign out, then sign in with the new password to prove it works.

Better still, give each administrator their own named Admin account (section 2.1). Then deactivate the bootstrap account, or keep it sealed as an emergency account. Keep at least two working Admin accounts: EMHIP does not stop you deactivating or demoting the last one. Once the account is secured, ask the hosting team to remove the bootstrap password from the server's environment file.

### 1.2 Setup checklist

Work through this list before staff start using the system.

1. **Organisation name**: **Settings** > **General**. It appears in every email and on the Excel service report.
2. **Support email**: **Settings** > **General**. It appears in the footer of every email.
3. **Email provider and test email**: **Settings** > **Email**. Choose the provider, fill in the **From address** and credentials, select **Save changes**, then use **Send test email** to send one to yourself. Until this works, no email leaves the system, including password resets.
4. **Email templates**: read each message on the **Email templates** tab. Note that **Account created** contains the new worker's temporary password.
5. **Document storage and test connection**: **Settings** > **Document storage**. Choose where files are kept before anyone uploads, fill in the fields, select **Test connection**, then **Save changes**.
6. **Uploads**: set the maximum file size, allowed file types and default retention period.
7. **Clinical, and Security & data protection**: check the urgent response window, inactivity threshold, idle sign-out time and record retention period.
8. **Lookups**: review the drop-down lists that feed forms (section 5.2).
9. **Custom fields**: add any extra questions your hub needs (section 5.3).
10. **Roles**: review the built-in roles and create any custom roles before adding the staff who need them (section 3).
11. **Hub workers**: create an account for each member of staff (section 2).
12. **Data migration**: import records from the previous system, if needed (section 6).
13. **Bootstrap account**: secure it as described in section 1.1.

## 2. Hub workers

A hub worker is a staff account. Open **Hub Workers** under ADMIN; it needs `admin.manageusers`, which only the Admin role has by default. The table shows **Name**, **Email**, **Hub ID**, **Roles** and **Status**. Each row has **Edit**, **Reset password** and, for active accounts, **Deactivate**.

### 2.1 Add a hub worker

1. Open **Hub Workers** and select **Add hub worker**.
2. Enter the **Email**. This is the worker's sign-in name. It must be unique and cannot be changed later.
3. Enter the **Display name**. This is how the worker appears across the system, for example in staff pickers.
4. Leave **Hub ID** as it is filled in. It ties the worker to your hub's guests. A different value gives them an empty system.
5. Enter a **Temporary password** that meets the rules in section 2.6.
6. Tick one or more **Roles**. A worker with several roles gets every permission from all of them.
7. Select **Save**. If the account is refused, the reason appears in red, for example a password that is too short or an email already in use.

When the account is saved, EMHIP sends the **Account created** email (section 2.7).

> **Note:** The role tick boxes use the system names: **Cmhw**, **Cpn**, **HubManager** and **Admin**.

### 2.2 Edit a worker or change their roles

1. Select **Edit** on the worker's row.
2. Change the **Display name**, **Hub ID**, **Active** tick box or **Roles** as needed. The email address cannot be edited.
3. Select **Save**.

> **Note:** Role changes take effect the next time the worker signs in. Ask them to sign out and sign back in.

To change a worker's email address, create a new account with the new address and deactivate the old one.

### 2.3 Deactivate a worker

Accounts are never deleted, because each worker's name is linked to the records and audit trail they created.

1. Select **Deactivate** on the worker's row.
2. Confirm the message "Deactivate [name]? They will no longer be able to sign in."
3. The **Status** changes to **Deactivated**.

A deactivated worker cannot sign in, no longer appears in staff pickers such as the CMHW list, and no longer receives urgent-case or overdue-contact emails.

> **Warning:** Deactivation does not end a session that is already open. That session keeps working until the person signs out, is signed out for inactivity, or the session expires (8 hours by default). EMHIP cannot end another person's session.

#### Leaver checklist

1. On the **Guest** list, use the CMHW filter to find the leaver's caseload.
2. For each guest, open **Pathway History** and use **Reassign CMHW**.
3. On **Scheduled contacts**, search for the leaver as assignee and make sure someone picks up their open contacts.
4. On any document they left checked out, use **Force check-in** (section 7.7).
5. Deactivate the account.

### 2.4 Reactivate a worker

1. Select **Edit** on the worker's row.
2. Tick **Active**.
3. Select **Save**.

The worker signs in with their previous password. If they have forgotten it, reset it (section 2.5).

### 2.5 Reset a password

1. Select **Reset password** on the worker's row.
2. Enter a **New temporary password**.
3. Select **Reset**. If the password is refused, the form now shows the reason, for example "Passwords must have at least one digit".
4. Give the password to the worker by a secure route, such as in person or by phone. No email is sent for an admin reset.

Staff can also reset their own password with **Forgot password?** on the sign-in page, as long as email is working. The emailed link works once and expires after one day.

> **Note:** A reset does not unlock an account that is locked after five failed sign-ins. The lock lifts by itself after 15 minutes.

### 2.6 Password rules

- At least 10 characters.
- At least one capital letter, one lower-case letter and one number. Symbols are allowed but not required.
- Five wrong passwords in a row lock the account for 15 minutes.
- The sign-in page says "Invalid email or password." for a wrong password, a locked account and a deactivated account alike. This stops outsiders finding out which accounts exist.
- Sign-in, forgotten-password and reset requests are limited to 10 a minute from one network address. Past that, the sign-in page says "Too many sign-in attempts. Please wait a minute and try again."

### 2.7 The account-created email

When you save a new account, EMHIP sends the **Account created** email to the worker. It contains their sign-in address, the temporary password in plain text and a link to the portal. It asks them to change the password straight away, which they do with **Forgot password?** on the sign-in page.

If email is not set up, the account is still created but nothing is sent. Give the password to the worker yourself.

> **Tip:** If your information governance policy forbids passwords in email, switch off the **Account created** template (section 5.1) and hand passwords over in person.

## 3. Roles and permissions

### 3.1 How permissions work

- A permission allows one thing, such as `documents.upload`.
- A role is a named set of permissions. A worker can hold several roles and gets every permission from all of them.
- The list of permissions is fixed. You can only change which permissions each role holds.
- A worker's permissions are copied into their session when they sign in. Changes to their roles, or to a role's permissions, apply only after they sign out and back in.
- The server checks every action against those permissions. Hiding a button is never the only protection.

### 3.2 Built-in roles

| Role (as shown) | Description | Summary |
| --- | --- | --- |
| **Cmhw** | Community Mental Health Worker | Day-to-day casework on guests, contacts, documents and reports. |
| **Cpn** | Community Psychiatric Nurse | Everything a Cmhw has, plus logging CPN contacts and the CPN initial assessment. |
| **HubManager** | Hub Manager | Everything a Cmhw has, plus the Hub Manager dashboard, MDT Queue, report exports, document deletion and restore, read-only Settings, access logs and subject-access exports. |
| **Admin** | Administrator | Every permission. |

### 3.3 Permission matrix

The role editor groups permissions under Dashboard, Guests, Scheduled contacts, Urgent Cases, MDT, Reports, Documents, Settings and Administration. "Yes" means the built-in role has the permission.

| Permission | What it allows | CMHW | CPN | Hub Manager | Admin |
| --- | --- | --- | --- | --- | --- |
| `dashboard.cmhw.view` | See the CMHW dashboard (own caseload) | Yes | Yes | Yes | Yes |
| `dashboard.hubmanager.view` | See the Hub Manager dashboard (whole hub) | | | Yes | Yes |
| `guests.view` | Guest list, search, guest records and Contact History | Yes | Yes | Yes | Yes |
| `guests.register` | Register guests and record the initial conversation | Yes | Yes | Yes | Yes |
| `guests.edit` | Actions and reminders, care plans, allocation, Reassign CMHW | Yes | Yes | Yes | Yes |
| `guests.demographics.view` | See the Demographics tab | Yes | Yes | Yes | Yes |
| `guests.demographics.edit` | Change demographics | Yes | Yes | Yes | Yes |
| `guests.clinical.view` | See clinical details, risk and DIALOG scores | Yes | Yes | Yes | Yes |
| `guests.clinical.edit` | Record risk and DIALOG; escalate and resolve urgent cases | Yes | Yes | Yes | Yes |
| `guests.pathway.view` | See pathway history | Yes | Yes | Yes | Yes |
| `guests.pathway.edit` | Refer a guest or change their pathway | Yes | Yes | Yes | Yes |
| `guests.notes.view` | Read notes, casework notes and the CPN Record | Yes | Yes | Yes | Yes |
| `guests.notes.add` | Use Add Contact, add notes and attachments | Yes | Yes | Yes | Yes |
| `guests.contacts.add` | Record a contact from Scheduled contacts | Yes | Yes | Yes | Yes |
| `guests.contacts.cpn` | Log CPN contacts and the CPN initial assessment | | Yes | | Yes |
| `guests.audit.view` | See a guest's Access Log tab | | | Yes | Yes |
| `guests.export` | Use Export Record (subject access) | | | Yes | Yes |
| `guests.erase` | Use Anonymise record | | | | Yes |
| `followups.view` | See Scheduled contacts | Yes | Yes | Yes | Yes |
| `followups.manage` | Schedule contacts and mark them done | Yes | Yes | Yes | Yes |
| `urgentcases.view` | Urgent Cases screen, badge, alerts and episode records | Yes | Yes | Yes | Yes |
| `mdt.manage` | Work the MDT Queue | | | Yes | Yes |
| `reports.view` | Open Reports, including Data Quality and Export History | Yes | Yes | Yes | Yes |
| `reports.export` | Download report exports | | | Yes | Yes |
| `documents.view` | See and download documents | Yes | Yes | Yes | Yes |
| `documents.upload` | Upload documents | Yes | Yes | Yes | Yes |
| `documents.edit` | Edit details, add versions, check out and in | Yes | Yes | Yes | Yes |
| `documents.delete` | Move documents to the recycle bin | | | Yes | Yes |
| `documents.restore` | See the recycle bin and restore documents | | | Yes | Yes |
| `documents.purge` | Permanently delete documents | | | | Yes |
| `settings.view` | Open Settings read-only | | | Yes | Yes |
| `settings.manage` | Change settings, email templates and custom fields | | | | Yes |
| `settings.lookups.manage` | Change lookup lists | | | | Yes |
| `admin.manageusers` | Hub Workers and Data migration | | | | Yes |
| `admin.manageroles` | Roles & Permissions | | | | Yes |

### 3.4 Create a custom role

1. Open **Roles & Permissions**, or select **Manage roles** on the Hub Workers screen.
2. Select **Add role**.
3. Enter a **Role name**. It must not match an existing role and cannot be changed later.
4. Enter a **Description**.
5. Tick the permissions the role should grant.
6. Select **Save**.
7. Assign the role on the **Hub Workers** screen (section 2.2), then ask those workers to sign in again.

> **Tip:** Every role that staff use on its own must include `dashboard.cmhw.view` or `dashboard.hubmanager.view`. Without one, the Dashboard shows "Unable to load the dashboard right now."

To give a few people one extra ability, create a small role holding only that permission and add it alongside their main role. For example, a "Lookup editor" role with `settings.lookups.manage` lets a Hub Manager edit drop-down lists. The person also needs `settings.view` to open Settings, which Hub Managers already have.

### 3.5 Edit or delete a role

- To edit, select **Edit permissions** on the role, change the **Description** or ticks, and select **Save**. No role can be renamed.
- To delete a custom role, select **Delete** and confirm. Workers who held it lose its permissions the next time they sign in.

### 3.6 Rules for the built-in roles

- **Cmhw**, **HubManager** and **Admin** carry a **built-in** label and cannot be deleted.
- You can add permissions to a built-in role, and the additions are kept.
- Removals do not last. Each time EMHIP restarts, which happens at every software update, it puts back any default permission missing from the four built-in roles.
- To give a group less than a built-in role allows, create a custom role and assign that instead.
- The **Cpn** role is built in, like Cmhw, HubManager and Admin: it shows the **built-in** label and cannot be deleted.

## 4. Settings

### 4.1 How the Settings page works

- Open **Settings** under ADMIN or with the gear icon. It needs `settings.view`.
- Without `settings.manage` the page is read-only and says so at the top. By default only Admins can change settings.
- The tabs are **General**, **Document storage**, **Uploads**, **Clinical**, **Interface**, **Email**, **Security & data protection**, **Email templates**, **Lookups**, **Custom fields** and **Data migration**.
- A changed field shows an **Unsaved** label and the header counts unsaved changes. Select **Save changes** to keep them or **Discard** to undo them.
- If you switch tab with unsaved changes, EMHIP asks you to choose **Keep editing** or **Discard and switch**.
- Secret fields, such as passwords and keys, are never shown again after saving. **Configured** means a value is stored. Leave the field blank to keep the stored value. A stored secret cannot be cleared from this screen.
- Clearing an ordinary field and saving puts it back to its default value.
- The main system uses a saved change straight away. Background jobs (the Inactive check, urgent-case and overdue-contact emails) can take up to five minutes to notice it.

The tables below list every option, its default, what it does and who it affects.

### 4.2 General

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Organisation name** | EMHIP | Used in email subjects, email headers and footers, the title of the Excel service report and the Documents page. The portal header always shows the EMHIP logo. | Email recipients, report readers |
| **Support email** | Blank | Printed in the footer of every email after "Questions?". It is not shown on the sign-in page. | Email recipients |
| **Date format** | dd MMM yyyy (31 Dec 2026) | Not used yet. Dates always use the built-in format. | Nobody |

### 4.3 Document storage

Choose the provider before the first upload. New files go to the selected provider. Files already stored stay where they were written and are still read from there.

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Storage provider** | Local disk (server volume) | Where new uploads are written. Also offers Amazon S3, S3-compatible (Contabo, MinIO, Spaces), Azure Blob Storage and Google Cloud Storage. | All uploads |
| **Local storage path** | /var/emhip/documents | Folder inside the application server. Local only. | All uploads |
| **Bucket** | Blank | Bucket name. Amazon S3 and S3-compatible only. | All uploads |
| **Region** | eu-west-2 | Storage region. Amazon S3 and S3-compatible only. | All uploads |
| **Access key** | Blank | Secret. Amazon S3 and S3-compatible only. | All uploads |
| **Secret key** | Blank | Secret. Amazon S3 and S3-compatible only. | All uploads |
| **Service URL** | Blank | Provider address, for example Contabo's. S3-compatible only. | All uploads |
| **Force path-style URLs** | Enabled | Needed by most S3-compatible providers, including Contabo. S3-compatible only. | All uploads |
| **Connection string** | Blank | Secret. Azure Blob Storage only. | All uploads |
| **Container** | emhip-documents | Container name. Azure Blob Storage only. | All uploads |
| **Bucket** (Google) | Blank | Bucket name. Google Cloud Storage only. | All uploads |
| **Service account JSON** | Blank | Secret. Paste the whole key file. Google Cloud Storage only. | All uploads |

#### Test the storage connection

1. Choose the **Storage provider** and fill in its fields.
2. Select **Test connection**. EMHIP writes a small test file and removes it again. Unsaved values are used for the test, and blank secrets fall back to the stored ones.
3. Read the message under the button. A failure shows the provider's error.
4. Select **Save changes**. The test alone does not save anything.

> **Warning:** Do not change the local storage path, or the bucket, container or credentials of a provider that still holds files. EMHIP reads older files using the current values for that provider, so those files would become unreadable.

### 4.4 Uploads

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Maximum file size (MB)** | 25 | The server refuses larger files. Do not set 0: the server then refuses every file. See section 10 about the browser limit. | Everyone who uploads |
| **Allowed file types** | pdf, doc, docx, xls, xlsx, png, jpg, jpeg, txt, csv, rtf, odt | Comma-separated file extensions the server accepts. Blank does not mean "any type": it restores the default list. | Everyone who uploads |
| **Default retention (years)** | 7 | Sets **Retain until** on a new document when the uploader leaves it blank. 0 means no retention date. | Document deletion |

### 4.5 Clinical

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Urgent response window (hours)** | 72 | Sets the deadline shown in the Urgent Episode Record and its export, and the hours quoted in the "Urgent case raised" email. The Urgent Cases screen ignores it (see below). | Urgent-case handling |
| **Inactivity threshold (days)** | 90 | Every 6 hours, Active guests with no recorded activity for this many days become Inactive. Guests with an open urgent flag are skipped. New activity makes a guest Active again. | All guests |
| **Default contact interval (days)** | 14 | Not used yet. The due date on a new scheduled contact starts blank. | Nobody |
| **DIALOG review interval (weeks)** | 12 | Not used yet. No DIALOG due date is suggested. | Nobody |

> **Warning:** The Urgent Cases screen always uses a fixed 72-hour window for its countdown, overdue counts and "within 72h" labels. The Urgent Episode Record uses this setting. If you change the setting, the two will disagree, so keep it at 72 until this is fixed.

> **Note:** The Data Quality report's "No contact in the last 90 days" line is fixed at 90 days. It does not follow the inactivity threshold.

### 4.6 Interface

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Guest list page size** | 50 | Not used yet. The guest list uses its own page size. | Nobody |

### 4.7 Email

With **Email provider** left at "Not configured (log only)", nothing is sent. Messages are written to the server log instead. The provider-specific fields appear once you pick a provider.

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Email provider** | Not configured (log only) | How email is delivered: SMTP server, Amazon SES or Mailgun. | All email |
| **From address** | Blank | The sender address. Required: without it no email is sent. | All email |
| **From name** | EMHIP Portal | The sender name. | All email |
| **Reply-to address** | Blank | Optional address for replies. | All email |
| **SMTP host** | Blank | For example smtp.office365.com. SMTP only. | All email |
| **SMTP port** | 587 | 587 for STARTTLS, 465 for SSL, 25 for internal relays. SMTP only. | All email |
| **Encryption** | STARTTLS (recommended) | Also SSL on connect, or None for an internal relay. SMTP only. | All email |
| **SMTP username** | Blank | Leave blank for relays without sign-in. SMTP only. | All email |
| **SMTP password** | Blank | Secret. SMTP only. | All email |
| **SES region** | eu-west-2 | The sending identity must be verified in this region. Amazon SES only. | All email |
| **SES access key** | Blank | Secret. Amazon SES only. | All email |
| **SES secret key** | Blank | Secret. Amazon SES only. | All email |
| **Mailgun domain** | Blank | For example mg.yourhub.org. Mailgun only. | All email |
| **Mailgun API key** | Blank | Secret. Mailgun only. | All email |
| **Mailgun region** | United States | Choose Europe for EU-hosted Mailgun domains. Mailgun only. | All email |
| **Email the worker when a case becomes urgent** | Enabled | Emails the guest's assigned CMHW with the "Urgent case raised" template. Nothing is sent if no CMHW is assigned. | Assigned CMHWs |
| **Email workers about overdue contacts** | Enabled | When scheduled contacts become overdue, each worker with overdue contacts gets one email listing up to 20 of them. | Contact assignees |

The overdue check runs every 15 minutes. Contacts normally become overdue overnight, when their due date passes, so in practice workers get about one email a day.

#### Send a test email

1. Choose the provider and fill in its fields, including **From address**.
2. Type your own address in **Send test email to**.
3. Select **Send test email**. Unsaved values are used, and blank secrets fall back to the stored ones.
4. Read the result under the button, then check your inbox.
5. Select **Save changes** so that real emails use the settings.

The test always uses the standard wording. Edits to the **Test email** template do not change it.

### 4.8 Security & data protection

| Option | Default | What it does | Affects |
| --- | --- | --- | --- |
| **Sign out after inactivity (minutes)** | 30 | Signs staff out after this long without activity, with a 60-second warning first. 0 turns it off. A change applies to each member of staff from their next sign-in. | All staff |
| **Record retention period (years)** | 20 | Guests with no activity for longer than this are listed as "due for retention review" on the Data Quality report. 0 removes the line. | Retention review |

### 4.9 Summary: settings with limited effect

| Setting | Tab | What actually happens |
| --- | --- | --- |
| **Date format** | General | Not used. |
| **Default contact interval (days)** | Clinical | Not used. |
| **DIALOG review interval (weeks)** | Clinical | Not used. |
| **Guest list page size** | Interface | Not used. |
| **Urgent response window (hours)** | Clinical | Used by the episode record and email only. Urgent Cases uses a fixed 72 hours. |
| **Inactivity threshold (days)** | Clinical | Moves guests to Inactive. Data Quality's "no recent contact" line stays at 90 days. |
| **Allowed file types** | Uploads | Blank restores the default list instead of allowing any type. |

## 5. Email templates, lookups and custom fields

### 5.1 Email templates

Open **Settings** > **Email templates**. Anyone with `settings.view` can read the templates. Changing them needs `settings.manage`.

| Template | Sent when | Sent to |
| --- | --- | --- |
| **Password reset** | Someone uses **Forgot password?** on the sign-in page | That member of staff |
| **Account created** | An admin adds a hub worker | The new worker, with their temporary password |
| **Urgent case raised** | A risk flag escalates a guest to Urgent Cases | The guest's assigned CMHW |
| **Contact overdue** | Scheduled contacts become overdue | Each worker with overdue contacts |
| **Test email** | Never; **Send test email** uses fixed wording | Nobody |

#### Edit a template

1. Select the template in the list on the left.
2. Change the **Subject**, **HTML body** or **Plain-text body**. The plain-text body is optional; if blank, EMHIP makes one from the HTML.
3. To add a placeholder, click in the field first, then select one of the **Tokens** chips. It is inserted into that field as, for example, `{{recipientName}}`.
4. Select **Preview** to see the message filled in with sample data.
5. Select **Save template**. **Discard** throws away unsaved edits.

To go back to the original wording, select **Restore default** and confirm.

#### Tokens

Every template can use `{{organisationName}}`, `{{supportEmail}}`, `{{portalUrl}}` and `{{year}}`. Each template also has its own tokens:

| Template | Extra tokens |
| --- | --- |
| **Password reset** | `{{recipientName}}`, `{{resetUrl}}` |
| **Account created** | `{{recipientName}}`, `{{email}}`, `{{temporaryPassword}}`, `{{portalUrl}}` |
| **Urgent case raised** | `{{recipientName}}`, `{{guestName}}`, `{{guestReference}}`, `{{riskFlags}}`, `{{raisedAt}}`, `{{guestUrl}}`, `{{responseHours}}` |
| **Contact overdue** | `{{recipientName}}`, `{{overdueCount}}`, `{{followUpList}}` (the list of overdue contacts), `{{portalUrl}}` |
| **Test email** | `{{recipientName}}`, `{{providerName}}` |

#### Turn an email off

Switch off **Send this email** at the top of the template and select **Save template**. The template then shows **Off** and that message is never sent.

> **Warning:** Turning off **Password reset** stops staff resetting their own passwords. Every reset then needs an admin.

> **Note:** The **Urgent case raised** email contains the guest's name and risk flags. If your policy does not allow that in email, edit the template to remove `{{guestName}}` and `{{riskFlags}}`.

### 5.2 Lookup lists

Lookups are the drop-down lists used across EMHIP. Open **Settings** > **Lookups**. Anyone with `settings.view` can read them. Changing them needs `settings.lookups.manage`, which only Admins have by default.

The screen lists every category on the left. Only the lists below feed a screen at present.

| List (as shown) | Where its options appear |
| --- | --- |
| **Document categories** | Category when uploading or editing a document; Category filter on Documents |
| **Ethnicity** | Registration; Demographics tab; ethnicity filter on the Guest list and Reports |
| **Gender** | Registration; gender filter on the Guest list and Reports |
| **Country of origin** | Demographics tab; filter on the Guest list and Reports |
| **Marital status** | Demographics tab |
| **Living group** | Demographics tab, as "Living situation" |
| **Secondary referral subcategory** | Registration, when the referral is secondary |
| **Cpn referral reason** | Add Contact, "Primary reason for CPN referral" |
| **Mdt decline reason** | MDT Queue, "Reason for declining" |
| **Cpn assessment method** | CPN initial assessment, "Method of assessment" |
| **Cpn others present** | CPN initial assessment, "Others present" |
| **Cpn referral source** | CPN initial assessment, "Referred by" |
| **Cpn diagnosis status** | CPN initial assessment, "Current diagnosis (if known)" |
| **Cpn follow up frequency** | CPN initial assessment, "Contact frequency" |
| **Hub activities** | Add Contact, Activity contact type, "Activity" |
| **AFA advice types** | Add Contact, AFA contact type, "Description" |

The lists below appear on the Lookups tab but have no effect yet. Their screens use fixed lists or free text instead.

- **Referral sources**
- **Housing status**
- **Employment status**
- **Preferred languages**
- **Diagnosis groups**
- **CMHT teams**
- **Escalation reasons**
- **Escalation urgency**
- **Contact cadences**
- **Emergency contact relationships**

#### Add an option

1. Select the category on the left.
2. Select **Add option**.
3. Enter the **Label**, the wording staff will see.
4. Check the **Code**. It is filled in from the label and is stored on records, so it cannot change later.
5. Select **Add option**.

#### Rename, reorder, deactivate or delete

- **Rename**: select **Edit** on the row, change the label, then **Save**.
- **Reorder**: use the **Move up** and **Move down** arrows. Drop-downs follow this order.
- **Deactivate**: select **Deactivate**. The option disappears from drop-downs. **Activate** brings it back. Tick **Show inactive items** to see deactivated options.
- **Delete**: only for options you added. Options marked **Built-in** cannot be deleted; deactivate them instead.

#### What happens to existing records

- Deactivating or deleting an option never changes records that already use it. They keep the stored value.
- Most lists store the wording itself. Renaming such an option affects new entries only; older records keep the old wording.
- **Document categories** and the five CPN initial assessment lists store the code. The code never changes, so older records stay linked to the renamed option.
- Software updates may add new built-in options. Your renames and deactivations are kept.

### 5.3 Custom fields

Custom fields are extra questions you add to EMHIP's forms. They appear in an **Additional information** panel under the standard fields. Open **Settings** > **Custom fields**. Changing them needs `settings.manage`. DIALOG scores and the risk assessment cannot be extended, so they stay comparable over time.

| Form (as shown) | Where the fields appear |
| --- | --- |
| **Guest record** | The registration page and the guest's Overview tab |
| **Documents** | Upload document, and a document's details |
| **Contact log** | Recording a contact from the Scheduled contacts screen only; not the Add Contact popup |
| **Scheduled contacts** | Scheduling a contact on the Scheduled contacts screen |
| **Actions & reminders** | The guest's Actions & Reminders tab |

Field types are **Text**, **Long text**, **Number**, **Date**, **Yes / no**, **Choose one** and **Choose several**.

#### Add a field

1. Select the form on the left.
2. Select **Add field**.
3. Enter the **Label**. The **Reference name** is worked out from it and is fixed once saved.
4. Choose the **Type**.
5. For **Choose one** or **Choose several**, enter the **Options**, one per line.
6. Add optional **Help text**, shown under the field.
7. Tick **Required** if the form must not be saved without an answer.
8. Select **Add field**.

#### Change, reorder, deactivate or delete a field

- **Edit** lets you change the label, options, help text and Required. The reference name stays the same.
- The type can only be changed while no record holds an answer. After that, deactivate the field and add a new one.
- **Move up** and **Move down** set the order on the form.
- **Deactivate** hides the field from forms but keeps every stored answer. Tick **Show inactive fields** to see it again.
- **Delete** removes a field that has no answers. A field with answers is deactivated instead, and EMHIP tells you so.

#### What happens to existing records

- Making a field **Required** affects older records too. Staff cannot save that record's Additional information panel until they answer it.
- Removing an option from a choice field leaves older answers in place. When such a record is next saved, EMHIP says the field "does not offer" that option until staff pick another.
- Deactivated fields and their answers stay in the database.

## 6. Data migration

Data migration imports guest records from the previous system, one guest per row of a CSV file. Open **Settings** > **Data migration**. It needs `admin.manageusers`, so only Admins can use it by default. Others see a notice instead.

Each row can create or update one guest with contact details, status, pathway, referral details, demographics, one note and one DIALOG assessment. Original registration, activity and DIALOG dates are kept.

- Guests are imported into your own hub, with no CMHW assigned.
- Consent is recorded as given for every imported guest. Make sure consent was obtained in the old system.
- Imported notes and DIALOG assessments are recorded as made by you.

### 6.1 Before you start

- Export the old records as a CSV file, ideally UTF-8. The file can be up to 100 MB.
- Write every date as year-month-day, for example `2024-06-01`. Other formats can swap the day and month in the registration, activity and DIALOG dates.
- Keep only the template's columns. Any other column makes the dry run fail.
- Give every row a `legacy_id`, the old system's reference. Without it, a second run creates duplicates.
- Try a file of 10 to 20 rows first and check the results before importing everything.

### 6.2 The template columns

Only `first_name`, `last_name` and `date_of_birth` are required. Everything else is used when filled in.

| Column | What to put in it |
| --- | --- |
| `legacy_id` | The old system's reference. Makes re-runs update instead of duplicate. |
| `first_name` | Required. |
| `last_name` | Required. |
| `date_of_birth` | Required. For example 1988-03-14. |
| `gender` | Text. |
| `phone` | Text. |
| `email` | Text. |
| `address_line1` | Text. |
| `address_line2` | Text. |
| `post_code` | Text. |
| `registered_at` | Original registration date. |
| `status` | New, Active or OnHold. See 6.3. |
| `pathway` | MentalWellbeing, ClinicalSupport or CommunityRecovery. |
| `afa_support` | true, yes or 1 if practical support (AFA) is needed. |
| `referral_source` | Text, for example GP referral. |
| `referral_type` | Primary or Secondary. |
| `referral_subcategory` | Text. Saved only with a valid `referral_type`. |
| `ethnicity` | Match the Ethnicity lookup wording so filters work. |
| `nationality` | Text. |
| `preferred_language` | Text. |
| `housing_status` | Text. |
| `employment_status` | Text. |
| `marital_status` | Match the Marital status lookup wording. |
| `living_group` | Match the Living group lookup wording. |
| `country_of_origin` | Match the Country of origin lookup wording. |
| `gp_name` | Text. |
| `gp_practice` | Text. |
| `nhs_number` | Text. |
| `last_activity_at` | Date of the guest's last activity. Drives Inactive status and retention review. |
| `notes` | Becomes one note on the guest's Notes tab. |
| `dialog_scores` | 11 whole numbers from 1 to 7, separated by spaces or semicolons. |
| `dialog_assessed_at` | Date of that DIALOG assessment. Blank means the import date. |

### 6.3 Accepted values

| Column | Accepted values | Anything else |
| --- | --- | --- |
| `status` | New, Active or OnHold. OnHold is the value for Inactive. "On Hold" with a space also works. Blank means New. | Fails the dry run. `Inactive` is not accepted. |
| `pathway` | MentalWellbeing, ClinicalSupport or CommunityRecovery. Spaces are allowed, for example "Mental Wellbeing". | Fails the dry run. |
| `referral_type` | Primary or Secondary. | Ignored without warning. |
| `afa_support` | true, yes or 1. | Treated as no. Only saved when `pathway` is filled. |
| `dialog_scores` | Exactly 11 numbers from 1 to 7. | Reported during the real import only; the DIALOG is skipped. |

If a row says OnHold but has a `last_activity_at` date, the guest is first set to Active. Within six hours the Inactive check moves them back if that date is older than the inactivity threshold.

### 6.4 Import step by step

1. Open **Settings** > **Data migration**.
2. Select **Download template**. This saves `emhip-guest-import-template.csv`, with every column and one example row.
3. Copy your data into the template's columns, one guest per row. Delete the example row.
4. Save the file as CSV.
5. Drop the file on **Drop your CSV here, or click to choose one**, or click it to choose the file.
6. Select **Validate (dry run)**. Every row is checked and nothing is written.
7. Read the **Dry run report** (section 6.5).
8. If there are problems, fix them in your file, choose the file again and validate again. **Import** stays locked until a dry run finds no problems for the chosen file.
9. Select **Import**. Read the counts in **Import into the live database?**, then select **Import now**.
10. Read the **Import report**. Open a few imported guests and check them against the old system.

### 6.5 Reading the report

The report shows **Rows read**, **Guests created**, **Guests updated**, **Notes created**, **DIALOG assessments** and **Rows with problems**. Below that is a table of **Row**, **Column** and **Problem**, showing the first 100 problems. Row numbers match a spreadsheet: the header is row 1, so the first guest is row 2.

| Problem shown | Meaning | Fix |
| --- | --- | --- |
| Unrecognised column 'x' — it will be ignored. | A column is not in the template (reported on row 1) | Delete or rename the column |
| Required. | `first_name` or `last_name` is empty | Fill it in |
| Could not read 'x' as a date. | `date_of_birth` is empty or unreadable | Use year-month-day |
| Unknown pathway 'x'. | Not one of the three pathways | Correct the value |
| Unknown status 'x' — defaulting to New. | Not New, Active or OnHold | Correct the value |
| Expected 11 numbers between 1 and 7… | Bad `dialog_scores` (real import only) | Correct the scores |
| The file is empty or has no data rows. | Only a header, or nothing | Check the export |

> **Note:** A dry run counts every valid row under **Guests created**, even rows that will update an existing guest. **Guests updated** is always 0 in a dry run.

> **Note:** A dry run does not check `dialog_scores`. A bad score is reported only during the real import; that guest is still imported without the DIALOG assessment.

### 6.6 Re-running an import safely

A row whose `legacy_id` matches a guest already imported into your hub updates that guest instead of creating a new one. Rows without a `legacy_id` always create new guests. Before re-running a file, understand what an update does:

- It replaces contact details, status and all demographics with the row's values. Blank cells clear the stored value, including details staff have added in EMHIP since.
- It changes the pathway only when the row gives one.
- It does not change the guest's name or date of birth.
- It always clears the emergency contact details and the interpreter flag.
- A blank `status` resets the guest to New.
- `notes` and `dialog_scores` are added again on every run, creating duplicate notes and DIALOG assessments.
- Anonymising a guest erases their legacy reference. Re-running their row creates a new, identifiable record.

The safe way to re-run:

1. Make a new file holding only the rows that failed or need correcting.
2. Empty the `notes` and `dialog_scores` cells for guests that were already imported. Keep the column headings.
3. Remove rows for guests who have since been anonymised.
4. Run the dry run and import as in section 6.4, ideally before staff start editing the imported records.

## 7. Documents administration

### 7.1 Where documents live

- **Guest Documents tab**: the everyday place. Open a guest and select **Documents**. Files uploaded here are linked to that guest automatically.
- **Add Contact attachments**: files attached in the Add Contact popup are stored as documents on the guest, in the "Casework note attachment" category.
- **Hub-wide Documents page**: type `https://emhip.brainshub.co.uk/documents` in the address bar. It is not in the menu but works for anyone with `documents.view`. It lists every document in the hub, with statistics, search, category and status filters, and a hub-wide recycle bin.

Use the hub-wide page for three things:

- Documents not linked to a guest, shown as **Hub document**, such as policies and blank forms. Leave **Linked guest** empty when uploading.
- Documents of anonymised guests, which can no longer be opened from a guest record.
- Housekeeping across all guests, such as emptying the recycle bin.

### 7.2 Who can do what

| Action | Permission | CMHW and CPN | Hub Manager | Admin |
| --- | --- | --- | --- | --- |
| See and download | `documents.view` | Yes | Yes | Yes |
| Upload | `documents.upload` | Yes | Yes | Yes |
| Edit details, add a version, check out and in | `documents.edit` | Yes | Yes | Yes |
| Delete (move to the recycle bin) | `documents.delete` | | Yes | Yes |
| See the recycle bin and restore | `documents.restore` | | Yes | Yes |
| Permanently delete | `documents.purge` | | | Yes |

The **Recycle bin** switch appears only for people who can restore or permanently delete.

### 7.3 Categories

Categories come from the **Document categories** lookup (section 5.2). Add, rename or deactivate them there. Attachments from the Add Contact popup are always filed as "Casework note attachment".

### 7.4 Retention dates

- Every document can have a **Retain until** date.
- If the uploader leaves it blank, EMHIP sets it to today plus **Default retention (years)**, which is 7 by default. A setting of 0 leaves it empty.
- To change it, open the document's actions menu, select **Edit details**, change **Retain until** and save.
- A document cannot be permanently deleted until its **Retain until** date has passed.
- Nothing is deleted automatically when the date passes. The date is a minimum, not a deletion schedule.

### 7.5 Delete and restore

To delete a document:

1. Open the document's actions menu and select **Delete**.
2. Optionally enter a **Reason**. It is shown in the recycle bin.
3. Select **Move to recycle bin**.

To restore a document:

1. Switch on **Recycle bin**.
2. Open the document's actions menu and select **Restore**.

### 7.6 Permanently delete

1. Switch on **Recycle bin**.
2. Open the document's actions menu and select **Permanently delete**.
3. Type `DELETE` to confirm.
4. Select **Permanently delete**.

Every version and the stored file are removed from storage and cannot be recovered in EMHIP. Server backups still hold copies until they expire after 14 days.

If EMHIP says "Document is retained until [date] and cannot be purged":

1. Restore the document (section 7.5).
2. Select **Edit details** and set **Retain until** to yesterday or earlier, or clear it. Save.
3. Delete the document again, then permanently delete it.

> **Note:** Record why you shortened the retention period. EMHIP logs the change of details but not your reason.

### 7.7 Checked-out documents

A document checked out by one person cannot be replaced by anyone else. If someone has left it checked out, open the document, and under **Check-out** select **Force check-in**. This needs `documents.edit`.

### 7.8 Storage and backups

Files are written to the provider chosen in **Settings** > **Document storage** (section 4.3). With the Local provider, the server backs up the files with the database before every update and nightly at 03:00, keeping 14 days. With a cloud provider, backups of the files are the provider's and your responsibility.

## 8. Data protection duties

EMHIP holds special-category health data about vulnerable people. The controls below support your UK GDPR duties. The full compliance register, including the organisational actions still open, is `docs/uk-gdpr-compliance.md` in the project repository.

### 8.1 The access log

- Open a guest and select the **Access Log** tab. It needs `guests.audit.view`, held by Hub Managers and Admins.
- It lists the 300 most recent events, newest first, with **When**, **Who**, **Event** and **Details**.
- It records every view, change, download, export and anonymisation of the record.
- For changes it records the names of the fields changed, never the values.
- Use it to answer "who has seen this record?" and to look into suspected misuse.

### 8.2 Export Record (subject access requests)

Use this when a guest asks for a copy of their data. It needs `guests.export`, held by Hub Managers and Admins.

1. Open the guest's record.
2. Select **Export Record** at the top of the record.
3. The browser saves `guest-record-G-[number].json`.
4. Download any documents the guest is entitled to from their **Documents** tab. The export lists documents but does not contain the files.
5. Review the file and remove information about other people before you send it.

The export holds every section of the record. That means the overview, demographics, clinical details, pathway, scheduled contacts and initial conversation. It also holds DIALOG scores, casework notes, care plans, contacts, caseload history, notes, actions, the document list, urgent episodes and the access log. It includes the latest 100 contacts, up to 200 documents and the latest 500 access-log entries.

Every export is recorded on the guest's Access Log as "Exported (subject access)" and on **Reports** > **Export History**.

### 8.3 Anonymise record (right to erasure)

Anonymising removes a guest's identifying details for good. Use it for an erasure request, or when a record has passed its retention period. It needs `guests.erase`, which only Admins hold.

Before you start:

- Resolve any open urgent episode. EMHIP refuses while one is open.
- Export the record first if you need to keep a copy for the requester.
- Check that no other legal duty requires the identifying details to be kept.

Steps:

1. Open the guest's record.
2. Select **Anonymise record**.
3. Read the dialog **Anonymise this guest's record**.
4. Enter the **Reason**, at least 10 characters, for example "Erasure request received 12 May". It is kept on the audit log.
5. Type `ANONYMISE` to confirm.
6. Select **Anonymise record**. EMHIP returns to the Guest list and the guest no longer appears.

What changes:

- The name becomes "Anonymised Guest [guest number]".
- The date of birth becomes 1 January of the birth year, so age bands still work in reports.
- Gender, phone, email, address, postcode and the legacy reference are removed.
- NHS number, GP details and emergency contact details are removed.
- All the guest's documents move to the recycle bin with the reason "Guest record anonymised".
- The record is hidden from every list and search.

What stays:

- The clinical history: casework notes, assessments, DIALOG scores, contacts, care plans and urgent episodes.
- Demographics such as ethnicity, used for anonymous reporting.
- The audit log, including your reason.

> **Warning:** This cannot be undone. Free text is not scrubbed, so names typed into notes remain. The guest's files stay in the recycle bin until permanently deleted, and their retention dates may block that. Find them on the hub-wide Documents page (section 7.1).

### 8.4 Retention review

Review this at least once a year.

1. Open **Reports** and select the **Data Quality** tab.
2. Find the line "No activity for over 20 years — due for retention review". The number follows **Record retention period (years)**.
3. Select **View guests →** to list those guests.
4. For each guest, decide whether to keep the record or anonymise it (section 8.3).

Being Inactive is not the same as being due for retention review. Inactive only means no recent activity.

### 8.5 Idle sign-out and session length

- Staff are signed out after a set time with no mouse, keyboard, touch or scroll activity. The setting is **Sign out after inactivity (minutes)**.
- A banner appears 60 seconds before: "You will be signed out in [n] seconds due to inactivity." Selecting **Stay signed in** resets the timer.
- After sign-out, the sign-in page explains that it happened because of inactivity.
- Whatever the activity, a session ends after 8 hours by default and the person must sign in again.

> **Note:** The system currently always signs staff out after 30 minutes, whatever the setting says. See section 10.

### 8.6 Routine duties

- Review who holds which role every quarter, using **Hub Workers** and **Roles & Permissions**.
- Deactivate leavers on their last day (section 2.3).
- Check **Reports** > **Export History** for subject-access exports and report downloads you do not recognise.
- Review the retention list yearly (section 8.4).

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| A worker sees "Invalid email or password." with the right password | Account locked after 5 wrong attempts, or deactivated | Wait 15 minutes; check **Status** on Hub Workers |
| A worker is still locked out after an admin reset | A reset does not lift the lock | Wait for the 15 minutes to pass |
| "Too many sign-in attempts. Please wait a minute and try again." | More than 10 sign-in or reset requests in a minute | Wait a minute; see section 10 if many staff see it |
| A new password is refused | Under 10 characters, or no capital, lower-case letter or number | Choose a password that meets section 2.6 |
| The reset page says the link is invalid or expired | Link over a day old or already used, or the password breaks the rules | Request a new link and follow section 2.6 |
| Someone cannot see a menu item or button | Their roles lack the permission | Add the permission or role, then ask them to sign out and back in |
| A permission change has no effect | Permissions are fixed at sign-in | Ask the worker to sign out and back in |
| A removed permission came back | Built-in roles regain defaults at every restart | Use a custom role instead (section 3.6) |
| "Built-in roles cannot be deleted." | Cmhw, HubManager and Admin are protected | Remove workers from the role instead |
| The Dashboard shows "Unable to load the dashboard right now." | The worker's roles have no dashboard permission | Add `dashboard.cmhw.view` to one of their roles |
| A deactivated worker is still using the system | Deactivation does not end open sessions | Their session ends at sign-out, idle sign-out or 8 hours |
| No emails arrive at all | Provider "Not configured", or **From address** blank | Set up **Settings** > **Email** and send a test |
| The test email fails | Wrong host, port, encryption or credentials | Read the error; check SES identity or Mailgun region |
| Password reset emails do not arrive | **Password reset** template switched off, or email not set up | Switch **Send this email** on; test email |
| A CMHW gets no urgent-case email | No CMHW assigned, setting off, or template off | Assign a CMHW; check both switches |
| Emails go to spam | Sender domain not authorised | Ask your email provider to set up SPF and DKIM |
| A setting change has no effect on emails or Inactive status | Background jobs refresh settings every few minutes | Wait five minutes |
| A worker cannot open Settings | No `settings.view` | Add it to one of their roles |
| Settings are read-only | No `settings.manage` | Ask an Admin to make the change |
| "File exceeds the [n] MB upload limit." | File too big for **Maximum file size (MB)** | Raise the limit, or shrink the file |
| The browser refuses files over 25 MB after the limit was raised | Browser uses 25 MB (section 10) | None yet; report to your support provider |
| "Files of type '.x' are not allowed." | Extension not in **Allowed file types** | Add the extension in **Settings** > **Uploads** |
| "The uploaded file is empty." | The file has no content | Save the file again and re-upload |
| A large upload fails with a general error | The server's web proxy may cap request size | Ask the hosting team to check the proxy limit |
| "Document is retained until [date] and cannot be purged." | Retention date is in the future | Follow section 7.6 |
| "Document is checked out by another user." | Someone else checked it out | Use **Force check-in** (section 7.7) |
| An option is missing from a drop-down | It was deactivated | Tick **Show inactive items** and select **Activate** |
| Editing a lookup list changes nothing on screen | The list is not used yet | See the unused lists in section 5.2 |
| "[field] is required." when saving | A required custom field has no answer | Answer it, or untick **Required** |
| "[field] does not offer: [option]." | The option was removed from a custom field | Pick another option, or add it back |
| **Import** stays greyed out | The last dry run found problems, or the file changed | Fix every problem, including extra columns, and validate again |
| Duplicate guests after an import | Rows had no `legacy_id` | EMHIP has no delete or merge; anonymise the duplicate (section 8.3). Always use `legacy_id` |
| "Resolve the guest's open urgent episode before anonymising the record." | The guest has an open urgent flag | Resolve the episode first |
| A guest turned Inactive unexpectedly | No activity within **Inactivity threshold (days)** | Record a contact; the guest becomes Active again |
| Clicking a guest or case does nothing just after an update | The open tab has old screens | EMHIP reloads itself once; otherwise refresh the page |

## 10. Known limitations in this version

These were found while checking this guide. Document 08, Known Issues and Recommendations, gives a recommendation for each.

- **Urgent Cases uses a fixed 72 hours.** The episode record and email follow **Urgent response window (hours)**; the Urgent Cases screen does not.
- **Four settings do nothing yet**: **Date format**, **Default contact interval (days)**, **DIALOG review interval (weeks)** and **Guest list page size**.
- **Blank Allowed file types** restores the default list instead of allowing every type.
- **Data Quality's "No contact in the last 90 days"** is fixed at 90 days.
- **Ten lookup lists are not used** by any screen (section 5.2).
- **No self-service password change.** Staff use **Forgot password?**, although the Account created email asks them to change their password.
- **The sign-in rate limit may be shared by all staff.** The server may count everyone as one network address, allowing only 10 sign-ins a minute across the hub.
- **Dry runs do not check DIALOG scores** and count updates as new guests (section 6.5).
- **Re-running an import** duplicates notes and DIALOG assessments, and clears demographics left blank (section 6.6).
- **Test email template edits are ignored** by **Send test email**.
- **Contact log custom fields** appear only when recording a contact from Scheduled contacts, not in the Add Contact popup.
- **Anonymisation does not scrub free text** in notes or the contents of files.

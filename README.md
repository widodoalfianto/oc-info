# IFGF OC Info

A lightweight Next.js site for:

- Care group details and sign-up
- Ministry team details and sign-up
- Events calendar

The root route redirects to `/care-group`, so this behaves like a utility site instead of a full homepage.

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Google Apps Script
- Google Sheets

## Local Setup

```bash
npm install
npm run dev
```

Node.js `>= 18.17.0` is required.

## Vercel Deployment

This project is a standard Next.js app, so Vercel can deploy it without a custom `vercel.json`.

Recommended setup:

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Let Vercel detect the framework as `Next.js`.
4. Add the production environment variables from the section below.
5. Deploy.

Set these in Vercel for Production:

- `SITE_CONTENT_SCRIPT_URL`
- `NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL`
- `NEXT_PUBLIC_MINISTRY_SCRIPT_URL`
- `SITE_CONTENT_REVALIDATE_SECONDS`
- `APPS_SCRIPT_SHARED_SECRET` if you are using the Apps Script lock-down
- `NEXT_PUBLIC_CARE_GROUP_FORM_URL` only if you want an embedded Google Form
- `NEXT_PUBLIC_MINISTRY_FORM_URL` only if you want an embedded Google Form

If you use `APPS_SCRIPT_SHARED_SECRET`, set the same value in Apps Script script properties as `FORM_SHARED_SECRET`, then redeploy the Apps Script web app.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values.

```env
# Optional Google Form embed URLs
NEXT_PUBLIC_CARE_GROUP_FORM_URL=
NEXT_PUBLIC_MINISTRY_FORM_URL=

# Spreadsheet-driven content endpoint for ministry teams and care groups
SITE_CONTENT_SCRIPT_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec
SITE_CONTENT_REVALIDATE_SECONDS=300

# Google Apps Script URLs for the built-in forms
NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec
NEXT_PUBLIC_MINISTRY_SCRIPT_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec

# Optional: lock Apps Script behind the Next.js form proxy
APPS_SCRIPT_SHARED_SECRET=
```

You can use one single Apps Script web app URL for all three script variables above.

## Dynamic Site Content

The ministry and care group lists now support spreadsheet-driven content.

- If `SITE_CONTENT_SCRIPT_URL` is set, the app fetches ministry teams and care groups from Apps Script.
- If it is not set or the request fails, the app falls back to seeded local data in `data/site-content.ts`.

## Spreadsheet Setup

Use one Google Spreadsheet with these sheets:

1. `Contacts`
2. `MinistryTeams`
3. `CareGroups`
4. `MinistryResponses`
5. `CareGroupResponses`

### `Contacts` headers

```text
key | name | email
```

`key` is auto-generated from `name` by the Apps Script setup formula, so your team mainly edits `name` and `email`.

### `MinistryTeams` headers

```text
name | leader | leaderKeys
```

### `CareGroups` headers

```text
name | leader | meets | location | leaderKeys
```

### `MinistryResponses` headers

```text
timestamp | name | email | phone | whatsAppConsent | ministryName
```

### `CareGroupResponses` headers

```text
timestamp | name | email | phone | whatsAppConsent | careGroupName
```

### Seed rows for `Contacts`

```text
 | Ari Adidarma |
 | Sangghara Kusumo |
 | Amadea Margo |
 | Alfianto Widodo |
 | Diana Taslim |
 | Kimberly Lukman |
 | Fira Soeharsono |
 | Sheila Gandadjaya |
 | Josh Thamrin |
 | Justin Darmawan |
```

### Seed rows for `MinistryTeams`

```text
Multimedia | Ari Adidarma | ari-adidarma
Sound | Sangghara Kusumo | sangghara-kusumo
Worship | Amadea Margo & Alfianto Widodo | amadea-margo,alfianto-widodo
Hospitality | Diana Taslim | diana-taslim
Events & Social Media | Kimberly Lukman | kimberly-lukman
Youth | Fira Soeharsono | fira-soeharsono
Children | Sheila Gandadjaya | sheila-gandadjaya
```

### Seed rows for `CareGroups`

```text
Family | Fira Soeharsono | Sunday 2:30 PM | IFGF OC | fira-soeharsono
Young Professional | Josh Thamrin | Friday 7:30 PM | IFGF OC | josh-thamrin
College | Justin Darmawan | Friday 7:30 PM | Rotating homes | justin-darmawan
```

## Apps Script Setup

Use the script in [apps-script/ifgf-oc-content-and-forms.gs](apps-script/ifgf-oc-content-and-forms.gs).

High-level steps:

1. Open the Google Spreadsheet.
2. Go to `Extensions -> Apps Script`.
3. Replace the default code with the contents of `apps-script/ifgf-oc-content-and-forms.gs`.
4. In the Apps Script editor, run `setupIfgfOcSheets()` once.
5. Authorize the script when prompted.
6. Confirm the spreadsheet now contains:
- `Contacts`
- `MinistryTeams`
- `CareGroups`
- `MinistryResponses`
- `CareGroupResponses`
7. Confirm `Contacts.key` auto-fills from the `name` column.
8. Click `Deploy -> New deployment`.
9. Choose `Web app`.
10. Set `Execute as` to `Me`.
11. Set `Who has access` to `Anyone`.
12. Copy the deployed `/exec` URL.
13. Put that same URL into:
   - `SITE_CONTENT_SCRIPT_URL`
   - `NEXT_PUBLIC_CARE_GROUP_SCRIPT_URL`
   - `NEXT_PUBLIC_MINISTRY_SCRIPT_URL`

If you already created the sheets with the older column layout, run `setupIfgfOcSheets()` again after updating the script. It now migrates the headers to the newer schema instead of requiring you to rebuild the tabs manually.

This gives you one spreadsheet and one Apps Script deployment for:

- dynamic ministry team content
- dynamic care group content
- care group form submissions
- ministry form submissions

### Leader notifications

Leader notifications can now be managed from the `Contacts` sheet.

- Put each leader in `Contacts` with a display `name` and `email`.
- `Contacts.key` is generated automatically from the contact name formula.
- In `MinistryTeams` and `CareGroups`, use the `leader` column for human-readable names.
- The `leader` cells get a dropdown sourced from `Contacts`, and Apps Script keeps the rightmost `leaderKeys` column in sync automatically.
- The app resolves leader names for display and leader emails for notifications from `Contacts`.
- For multiple leaders, separate names with commas or `&`.

When a built-in care group or ministry form is submitted, Apps Script writes the row into the response sheet and emails the resolved leader email addresses immediately.

## Guard Rails

The built-in forms now use a same-origin Next.js route before forwarding to Apps Script. That gives you one place to validate and reject unsafe traffic before it reaches your spreadsheet.

Current protections:

- form submissions are append-only and only support the two known form types
- the browser submits to `/api/forms`, not directly to the public Apps Script URL
- name, email, phone, and selected ministry or care group are validated before forwarding
- a hidden honeypot field blocks simple bot traffic
- a minimum fill time and max form session age block obvious scripted submissions
- duplicate submissions are dropped in Apps Script for a short window
- only known ministry and care group names already in the spreadsheet are accepted

### Optional lock-down

If you want to block direct public posts to the Apps Script `/exec` URL, set the same strong random value in both places:

1. `APPS_SCRIPT_SHARED_SECRET` in your Next.js environment
2. `FORM_SHARED_SECRET` in Apps Script `Project Settings -> Script properties`

Once both are set, Apps Script rejects requests that do not include the secret, which means normal submissions must flow through your Next.js route.

## Apps Script CI/CD

This repo now includes a dedicated GitHub Actions workflow for the Apps Script portion only:

- [`.github/workflows/apps-script-deploy.yml`](.github/workflows/apps-script-deploy.yml)

It is separate from Vercel and only runs when files in `apps-script/` change or when you trigger it manually.

### What it does

1. Validates the Apps Script manifest on pull requests and pushes
2. Installs `clasp`
3. Authenticates with Google Apps Script
4. Pushes the files from `apps-script/`
5. Creates a new Apps Script version
6. Optionally redeploys your existing web app deployment

### Required GitHub Secrets

Add these repository secrets in GitHub:

1. `GOOGLE_APPS_SCRIPT_CLASPRC_JSON`
2. `GOOGLE_APPS_SCRIPT_SCRIPT_ID`

Optional:

3. `GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID`

If `GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID` is set, the workflow will redeploy the existing web app after pushing.
If it is not set, the workflow will still push the latest code to the Apps Script project, but your deployed `/exec` web app version will need to be updated manually.

### How to get `GOOGLE_APPS_SCRIPT_CLASPRC_JSON`

The simplest reliable CI setup is to authenticate locally with `clasp` once, then store the resulting credentials JSON as a GitHub secret.

Local steps:

```bash
npm install -g @google/clasp
clasp login
```

Then copy the contents of the generated `.clasprc.json` file from your home directory into the GitHub secret:

- Windows: `%USERPROFILE%\.clasprc.json`
- macOS/Linux: `~/.clasprc.json`

### How to get `GOOGLE_APPS_SCRIPT_SCRIPT_ID`

Open the Apps Script project and copy the Script ID from:

- `Project Settings -> Script ID`

### How to get `GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID`

If you already created a web app deployment, copy its deployment ID from:

- `Deploy -> Manage deployments`

This lets the workflow redeploy the same web app instead of creating a brand new deployment each time.

### Notes

- The Apps Script workflow is intentionally isolated from your Vercel deployment.
- The workflow uses the `apps-script/` folder plus [apps-script/appsscript.json](apps-script/appsscript.json) as the source of truth for Apps Script.
- Local `.clasp.json` and `.clasprc.json` files are ignored by Git in this repo.

## Apps Script Testing

You can now validate and smoke test the Apps Script connection locally.

### Local commands

Validate env and endpoint format:

```bash
npm run validate:apps-script
```

GET-only smoke test for dynamic content:

```bash
npm run test:apps-script:get
```

POST-only smoke test for form submissions:

```bash
npm run test:apps-script:post
```

Run both:

```bash
npm run test:apps-script:all
```

The POST smoke test writes test rows into your Google Sheets response tabs with an `AUTOMATED_TEST_...` marker.
If the matching leader has an email in `Contacts`, the POST smoke test will also trigger a real notification email.

### GitHub Actions smoke workflow

This repo also includes:

- [`.github/workflows/apps-script-smoke.yml`](.github/workflows/apps-script-smoke.yml)

It supports:

- daily scheduled GET smoke tests
- manual runs with optional POST submission tests

### Required secret for smoke tests

Add this repository secret:

1. `APPS_SCRIPT_WEB_APP_URL`

Use the same deployed Apps Script `/exec` URL.

## Forms

Care Group and Ministry pages support two form modes:

1. Embedded Google Forms
2. Built-in form submission via Google Apps Script

If a Google Form URL is present, the page embeds the form.
If not, the built-in form submits through the local Next.js route and then forwards to Apps Script.

The built-in form now asks for:

- name
- email address, phone number, or both
- WhatsApp contact consent when a phone number is provided
- a live dropdown of care groups or ministry teams based on the spreadsheet

## Calendar

Calendar data lives in `data/events.json`.

Each event should follow this shape:

```json
{
  "id": "unique-id",
  "title": "Sunday Worship",
  "date": "2026-05-04",
  "time": "10:00 AM",
  "location": "Main Sanctuary",
  "description": "Join us every Sunday.",
  "category": "worship"
}
```

## Key Files

- `data/site-content.ts` contains the seeded fallback ministry and care group data
- `lib/site-content.ts` loads spreadsheet-backed content from Apps Script
- `app/care-group/page.tsx` renders dynamic care group content
- `app/ministry/page.tsx` renders dynamic ministry team content
- `components/InterestForm.tsx` contains the built-in Apps Script form flow
- `apps-script/ifgf-oc-content-and-forms.gs` is the Apps Script web app source

## Verification

```bash
npm run lint
```

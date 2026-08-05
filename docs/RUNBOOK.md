# Runbook

Operational notes for keeping this app running — not a design doc (see
`docs/ARCHITECTURE.md` for that). Written once at the end of the
production-hardening roadmap; update it when the shape of a cron job, a
deploy, or the backup story actually changes, not on every unrelated PR.

## Cron jobs

All five are defined in `vercel.json`, authenticated by a shared
`CRON_SECRET` bearer token (Vercel sets this automatically for its own Cron
triggers), and fail loudly via `sendErrorAlert()` — never silently — when
something genuinely goes wrong. None of them email on a normal, uneventful
run; that's deliberate, so a working cron doesn't add inbox noise.

| Schedule | Route | What it does |
|---|---|---|
| Daily, 06:00 UTC | `/api/cron/self-check` | Checks hamishai.org's own uptime/SSL — the site monitoring product, pointed at itself. Silent on success, alerts on failure or an SSL cert expiring within 14 days. |
| Daily, 08:00 UTC | `/api/cron/site-checks` | Runs `runSiteCheck()` against every active client's `website_url`, writes a `site_checks` row, alerts the client (via `sendSiteAlertEmail`) if something's actually wrong. |
| Weekly, Monday 08:00 UTC | `/api/cron/weekly-digest` | `sendWeeklyDigests()` — one email per client summarizing what's still open (awaiting-info requests, in-progress tasks). Skips a client entirely if nothing's outstanding, and skips anyone who's turned it off in `/portal/settings`. |
| Daily, 12:00 UTC | `/api/cron/email-inbox` | `checkEmailInbox()` — polls the connected Gmail inbox for new client emails, triages them the same way a manually-logged request would be. No-ops entirely if Google OAuth isn't configured. |
| Monthly, 1st at 09:00 UTC | `/api/cron/recurring-invoices` | `generateMonthlyInvoices()` — the pre-Phase-3 recurring billing flow. Now only acts on clients with a `maintenance_monthly_pence` set but **no** `stripe_subscription_id` yet; a client on a real subscription is billed by Stripe itself instead (see `subscription.ts`). |

**To trigger any cron route manually** (e.g. to test a change before the
next scheduled run):

```bash
curl -X GET https://hamishai.org/api/cron/site-checks \
  -H "Authorization: Bearer $CRON_SECRET"
```

Swap the path and use the real `CRON_SECRET` value from Vercel's project
environment variables. Safe to run any of these more than once — every one
of them is written to be idempotent (see each route's own file for exactly
how, e.g. `recurring-invoices.ts`'s per-client-per-month description match).

## Rolling back a bad deploy

Every push to `main` deploys to production automatically (Vercel's GitHub
integration). If a deploy is actively broken:

1. **Fastest fix — redeploy the last good one.** In the Vercel dashboard →
   this project → Deployments, find the last known-good deployment, open its
   `···` menu → "Promote to Production". Takes effect in seconds, no build
   step. Equivalent CLI: `vercel promote <deployment-url>`.
2. **If you'd rather fix forward**: revert the bad commit in git
   (`git revert <sha>`), push to `main`, let CI + the normal deploy pipeline
   run. Slower (~2 min build) but keeps `main` and production in sync,
   which the "promote an old deployment" path doesn't — that path leaves
   `main` pointing at code that isn't actually what's live until the next
   real push.
3. **If a schema migration was part of the broken change**: rolling back the
   *code* deploy does not roll back a SQL migration that already ran in
   Supabase — those are applied by hand (see every `supabase/schema-*.sql`
   file's own "run this once" instruction) and there's no automatic
   down-migration. Check whether the bad deploy's SQL is backwards-compatible
   with the previous code version before promoting an old deployment; if
   it isn't, you need a manual corrective migration, not just a code
   rollback.

## Restoring from a Supabase backup

**Status: procedure documented below, not yet actually dry-run.** Doing a
real restore test requires the Supabase dashboard directly (project
Settings → Database → Backups), which needs Hamish there to click through
it — flagging this as the one open action item from this phase rather than
claiming it's done when it isn't.

The procedure, once a dry run happens:

1. Supabase dashboard → the project → **Database → Backups**. On the plan
   this project is on, daily backups are retained for 7 days (Point-in-Time
   Recovery, if enabled, allows restoring to any moment within the retention
   window, not just a daily snapshot).
2. **Restore into a new project, never in place**, for a dry run — restoring
   in place on the live project would actually cut over production to the
   restored data. Supabase's restore flow supports "restore to a new
   project" for exactly this reason.
3. Once restored to the scratch project, point a local `.env.local` at its
   `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and run the app locally
   against it — confirms the backup is actually usable, not just that the
   restore operation itself succeeded.
4. Delete the scratch project once the dry run is confirmed working.

**If a real restore is ever needed** (not a drill): restoring in place will
briefly take the database offline and, depending on how far back the
restore point is, loses any writes between that point and now — invoices,
requests, and audit log entries included. Worth a moment's gut-check on the
actual timestamp before confirming, not just reflexively picking the most
recent point.

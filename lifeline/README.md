# LifeLine by Cognora
**Self-Healing AI Operations Controller for Campus Digital & Physical Infrastructure**
SOAIDEATHON-S3 · Team Cognora

A human-governed AIOps platform: students report hostel issues → LifeLine runs a
sandbox simulation that correlates signals and drafts a recovery playbook → risk
is ranked (low/medium/high) → every recommendation is routed to a warden/staff
dashboard, and high-impact actions require explicit human approval before
anything happens. Every step is written to an audit trail.

---

## 1. Tech stack

- **Frontend:** plain HTML5, CSS3, JavaScript — no build step, no framework.
- **Backend:** [Supabase](https://supabase.com) — Postgres database, Auth
  (email/password, no verification email), and private Storage buckets.
- **"AI" engine:** a deterministic, explainable rule-based scoring engine
  (`js/ai-engine.js`) that classifies risk and drafts a playbook from the
  report's category and text. It runs entirely in the browser — no API key,
  no external calls, no risk of rate limits or downtime during judging. See
  the note at the bottom of that file for how to swap in a real LLM later.

## 2. File structure

```
lifeline/
├── index.html            Landing page
├── register.html         Student registration (name, phone, BH no., room,
│                          email, boarding pass upload, password)
├── login.html             Student login
├── admin-login.html      Warden / staff login
├── report.html             Student: submit a problem + live sandbox console
│                          + "My Reports" list
├── admin.html             Warden dashboard: AI-ranked reports, approve/reject
├── css/style.css          Shared stylesheet (dark AIOps console theme)
├── js/
│   ├── supabase-client.js  Supabase config + shared helpers
│   ├── ai-engine.js        Risk classification + sandbox step generator
│   ├── register.js
│   ├── login.js
│   ├── report.js
│   └── admin.js
└── supabase/
    └── schema.sql          Full DB schema, RLS policies, storage buckets
```

## 3. Supabase setup (do this first — ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project: **SQL Editor → New query**. Paste the entire contents of
   `supabase/schema.sql` and click **Run**. This creates the `profiles` and
   `reports` tables, all Row Level Security policies, and the
   `boarding-passes` / `problem-images` storage buckets.
3. Go to **Authentication → Providers → Email** and turn **OFF** "Confirm
   email". This is required — the spec says students log in immediately
   after registering, with no email verification step.
4. Go to **Settings → API** and copy your **Project URL** and **anon public**
   key.
5. Open `js/supabase-client.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```
6. **Create your first warden/admin account:** register normally through
   `register.html` using the account you want to be staff, then in Supabase
   go to **Table editor → profiles**, find that row, and change `role` from
   `student` to `admin`. That account can now log in at `admin-login.html`.

That's the entire backend. No servers, no Edge Functions required to run the demo.

## 4. Run it locally

Because the app calls `fetch`/Storage APIs, open it through a local server
rather than double-clicking the HTML file (plain `file://` URLs can trip up
CORS in some browsers). Any of these work:

```bash
# Option A — Python (built in on most machines)
cd lifeline
python3 -m http.server 5500
# then open http://localhost:5500

# Option B — Node
npx serve lifeline

# Option C — VS Code
# Install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

Then:
1. Open `register.html`, sign up a student.
2. On `report.html`, submit an issue — watch the sandbox console run live and
   route the report to the warden dashboard.
3. Log in at `admin-login.html` with your admin account and approve/reject it
   on `admin.html`.

## 5. Deploy it (for your demo link)

Any static host works since there's no backend server to run — Supabase
handles all of that already. Fastest options:

### Netlify (drag-and-drop, ~1 minute)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the whole `lifeline/` folder onto the page.
3. You'll get a live URL immediately. Done.

### Vercel
1. `npm i -g vercel` (once).
2. `cd lifeline && vercel --prod` and follow the prompts (choose "no
   framework" / static site when asked).

### GitHub Pages
1. Push the `lifeline/` folder contents to a GitHub repo.
2. Repo → **Settings → Pages** → set source to the `main` branch, root folder.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

No environment variables are needed on the host — the Supabase URL/key are
already embedded in `js/supabase-client.js` (the anon key is safe to expose
publicly; access is governed by the RLS policies in `schema.sql`).

## 6. Demo script (suggested, ~3 minutes)

1. **Register** a student (mention: no email verification, boarding pass
   upload for hostel-identity verification).
2. **Submit a report** with a high-severity phrase (e.g. "saw sparks and a
   burning smell near the socket") — watch the **sandbox console** run its
   correlation/simulation steps live, land on a **HIGH** risk badge, and
   explicitly say the action needs warden approval before execution.
3. Submit a second, low-severity report (e.g. "WiFi is a bit slow") to show
   the risk ranking differs and the recommended playbook is proportionate.
4. **Switch to the warden dashboard**, filter by "Awaiting approval" / "High"
   risk, show the AI's reasoning + recommended playbook + full audit trail,
   then **Approve** it — point out the audit trail now shows every step from
   submission → sandbox → approval, all with actor and timestamp.

## 7. Known limitations / what's next

- The AI engine is rule-based for demo reliability; `js/ai-engine.js` has a
  documented seam to swap in a real LLM call via a Supabase Edge Function.
- Sandbox simulation is a UI + reasoning simulation (as required — "simulate
  or sandbox changes before execution"), not a connection to real building
  systems.
- Graceful degradation ("continue to provide useful diagnostics when some
  sensors or services are unavailable") is modeled via the deterministic
  scoring engine always producing a result even with partial report data —
  a production version would add real sensor health checks per step.

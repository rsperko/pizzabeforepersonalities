# Pizza Before Personalities

A free, static replacement for the Google Sites page, hosted on **Cloudflare Pages** and backed by a **Google Sheet**. Edit the sheet, and the site updates within a few minutes — no code, no server, no API key.

## How it works

- `index.html` / `styles.css` / `app.js` — the whole site. Plain static files.
- `app.js` fetches the schedule as CSV directly from a published Google Sheet (or, until that is set up, from the bundled `data/archive.csv`), then renders the next gathering plus the full searchable archive.
- The data has seven columns: **Date, Pizza, Pizza Time, Meeting, Meeting Time, ACIC, Announcement**.

There is no build step. What you see in this folder is exactly what gets served.

## One-time setup

### 1. Create the Google Sheet

1. Make a new Google Sheet.
2. Put these headers in row 1, columns A–G: `Date`, `Pizza`, `Pizza Time`, `Meeting`, `Meeting Time`, `ACIC`, `Announcement`.
3. Import the seed data: **File → Import → Upload** `data/archive.csv`, and choose *Append to current sheet* (or just paste it in). It is in chronological order, so the newest event is the last row.
4. Keep dates in `MM/DD/YY` format (e.g. `06/24/26`).

### 2. Publish the sheet as CSV

1. In the sheet: **File → Share → Publish to web**.
2. Under *Link*, choose the specific tab and the **Comma-separated values (.csv)** format.
3. Click **Publish**. Copy the URL it gives you. It looks like:
   `https://docs.google.com/spreadsheets/d/e/<long-id>/pub?output=csv`

### 3. Point the site at the sheet

Open `config.js` and paste the URL into `sheetCsvUrl`:

```js
window.PBP_CONFIG = {
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv",
  ...
};
```

Leave it as `""` to keep using the bundled `data/archive.csv` (useful for local testing).

### 4. Deploy to Cloudflare Pages

1. Push this folder to a GitHub repo (or use direct upload).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git** (or **Upload assets**).
3. Build settings: **Framework preset = None**, **Build command = (empty)**, **Output directory = `/`**. It is just static files.
4. Deploy. You get a free `*.pages.dev` URL immediately.

### 5. Attach the custom domain

In the Pages project: **Custom domains → Set up a custom domain → `pizzabeforepersonalities.com`**. If the domain's DNS is on Cloudflare, this is automatic and free, including HTTPS.

## Editing going forward

**To add the next month's event, just add a new row at the bottom of the sheet** — Date, Pizza, Pizza Time, Meeting, Meeting Time, ACIC, and an optional Announcement. That is the whole job. The site sorts by date on its own, so the new row automatically becomes the "Next Gathering" card and the top of the archive; you never have to insert rows or re-sort.

The **Pizza Time** and **Meeting Time** cells drive the times shown on the featured-event card, so you can change them per month (e.g. when the meeting precedes pizza). Type them exactly as you want them to appear, including am/pm — for example `5:30pm`. They are only shown on that card, never in the archive table.

### Announcements (column E)

Add a fifth column to the sheet titled **`Announcement`**. Whatever you put in that cell for a given row shows as a highlighted "Heads up" banner on the featured-event card — use it for things like a shifted date or "the meeting precedes pizza this month."

- It only displays for the **featured (next/most-recent) event**, never in the archive table, so old announcements quietly disappear once that event passes.
- Leave the cell blank when there is nothing to say — no banner appears.
- The column is optional; if the sheet has no `Announcement` column at all, the site just never shows a banner.

The published CSV refreshes on Google's side within ~5 minutes, and the site picks it up on the next load. No redeploy needed.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` via `file://` will not work — browsers block `fetch` of local files. Use the server above.

## Notes

- A published sheet is **public read-only** data. That is fine here; the schedule is already public. Do not put anything private in it.
- The "Next Gathering" card shows the soonest event dated today or later; if none are upcoming it falls back to the most recent past event.
- Times come from the sheet's `Pizza Time` / `Meeting Time` columns. The `pizzaTime` / `meetingTime` values in `config.js` are only a fallback used when those cells are blank.

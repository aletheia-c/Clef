# Remote Tag Editor — Frontend v2

A full rewrite of the web UI on a modern stack. Same layout as the original
(file explorer on the left, tag editor on the right, collapsible change-history
panel between them), rebuilt with:

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with shadcn-style components on **Radix UI** primitives
- **React Router** — the current directory is reflected in the URL
  (`tag.example.com/artist_1/album_2`) so paths are copy-pasteable
- **@tanstack/react-virtual** — the file list is virtualized to stay fast with
  very large folders
- **lucide-react** icons

It lives in `frontend-v2/` alongside the original `frontend/`; nothing here
touches the backend or git.

## Requirements

- Node.js 18+ (developed on Node 22)
- The Crow backend running (for real data)

## Develop

```bash
cd frontend-v2
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

The dev server proxies `/api/*` to the backend. It defaults to
`http://localhost:18080` (the backend's default port). Point it elsewhere with:

```bash
VITE_API_TARGET=http://localhost:8080 npm run dev   # e.g. the dockerized stack
```

If the backend isn't running yet, the sign-in screen shows a connection error
with a retry button.

## Authentication

The UI uses the backend's in-memory, cookie-based sessions:

- On load, `GET /api/settings` checks the session before mounting the editor.
  It must return **401** for a missing, expired, or unknown session and its normal
  JSON settings for an authenticated request.
- The sign-in form sends `POST /api/auth/login` with JSON
  `{ "username": "…", "password": "…" }`. Return **401** for invalid credentials.
  On success return **200** or **204** and a `Set-Cookie` header. An empty or
  plain-text login body is supported; no token is read from the body.
- After login, the UI checks `/api/settings` again to confirm that the cookie
  works. A successful login response alone does not open the editor.
- All API fetches include credentials. An API **401**, including from uploads
  or the heartbeat, unmounts the editor and shows sign-in again. Other failures
  do not get treated as an expired session. The current directory URL is kept.
- Tokens and passwords are not stored in localStorage or sessionStorage.
  The password field is cleared after successful sign-in.

Example cookie: `clef_session=<token>; HttpOnly; SameSite=Lax; Path=/; Secure`.
Use HTTPS with `Secure`; for plain HTTP development omit that flag. With the
existing Vite/nginx proxy, the browser sees same-origin API requests. Keep login
public and protect `/api/settings` and the library API with the middleware.
While the draft middleware allows anonymous settings requests, the frontend
will interpret their successful response as an active session and skip login.
After a backend restart, reject the stale cookie with **401**.

## Build for production

```bash
npm run build      # type-checks, then emits static files to dist/
npm run preview    # serve the built dist/ locally to sanity-check
```

`npm run build` produces a plain static bundle in `dist/`, served the same way
as the old `frontend/` (nginx serving files + proxying `/api`). The app calls
`/api` **same-origin**, so no configuration is needed in production.

### nginx note (deep links)

Because directories are real URLs, nginx must fall back to `index.html` for
unknown paths, otherwise refreshing/sharing `…/artist_1/album_2` 404s. Point the
web root at the build and add `try_files`:

```nginx
location / {
    root /app/frontend-v2/dist;   # wherever you deploy dist/
    index index.html;
    try_files $uri $uri/ /index.html;   # <-- SPA fallback (new)
}

location /api/ {
    proxy_pass http://127.0.0.1:18080;
    client_max_body_size 0;
}
```

## Backend endpoints used

`tag-registry` returns the normalization table as `{ "Display Name": ["RAW",
…] }`; the older bare `string[]` of names is still accepted (it just leaves
every tag showing its raw spelling).

From `api.md`: `getmntpoint`, `list`, `tag`, `tag-registry`, `gethistory`,
`edittag`, `addfieldtag`, `removefieldtag`, `mkdir`, `rename`, `store`,
`heartbeat`, and `getalbumcover` (**placeholder** — the UI loads it and falls
back to a "No cover art" placeholder until you implement it).

Also used (not in `api.md`, present in the backend): `settings` (reads
Clef_ID mode via the backend's `clef_id` field / mountpoint / version) and `undo`
(per-entry history undo). All API
calls degrade gracefully if an endpoint is missing.

> Note: `/api/events/delete` is intentionally **not** called from the UI — it's
> driven by the backend's inotify + curl watcher. The Clef_ID is shown as a
> read-only badge.

The frontend recognizes `Clef_ID` and legacy `RTEID` tags, including their
ID3v2 and MP4 prefixes. Settings, history, and undo payloads use `clef_id` in JSON. Backend variables
and the database column use `clefId`; the embedded music tag is `Clef_ID`.

## Feature map

- **File manager** — sortable Name/Type columns with direction arrows;
  virtualized list; single / Ctrl+click / Shift+click selection; breadcrumb;
  Back / Forward / Up / Refresh toolbar; drag-and-drop upload.
- **Navigation** — browsing changes the URL; browser + mouse thumb buttons
  (back/forward) navigate history.
- **Shortcuts** — `Ctrl+F` focus search, `Ctrl+A` select music files only,
  `↑`/`↓` (with `Shift`) move/extend selection, `Enter` open folder, `Esc`
  clear selection.
- **Right-click** — on a file/folder: New Folder / Rename (selects it first);
  elsewhere: no native browser menu.
- **Tag panel** — album-cover placeholder; one textbox per tag; multi-valued
  tags (Artists, etc.) render one box per value with a hover cross; delete asks
  for confirmation; edits offer **Save file** / **Save folder**; add-field with
  tag-registry autocomplete. Right-click: Add / Remove tag field.
- **Tag names** — the backend reads and writes **raw** container names (`TPE2`,
  `©gen`, `ALBUMARTIST`, `TXXX:Artists`); `GET /api/tag-registry` supplies the
  display names they normalize to. Matching is **exact**: a raw name the table
  doesn't list verbatim keeps its own spelling (`AUTHOR` is not the table's ASF
  `Author`), so widening coverage means editing `mapping.json`, not the UI. The
  tumbler in the tag-panel header (also in Settings) flips every label between
  the two spellings. Normalization is display-only:
  each write carries the raw name the file itself reported, and folder- or
  selection-wide writes re-resolve it per file, so an mp3's `TPE1` never lands
  on a flac. See [`src/lib/tagRegistry.ts`](src/lib/tagRegistry.ts).
- **Multiple files** — rows group by field, so files that spell a tag
  differently still edit as one row (files without the field are skipped);
  shared values shown directly; differing values show `<keep>` with a dropdown
  of all values; picking one stages it and reveals **Save all** (nothing is
  written until you save).
- **Change history** — collapsible panel (toggle in the tag header) with tag
  filter chips, newest/oldest sort, and per-entry **Undo**.

# Beulah Foods Store

A modern food store website for Beulah Foods, built as a static front end with supporting Cloudflare and Firebase backend pieces.

## What's In This Repo

- Static website pages for the storefront, blog, contact, auth, and admin screens
- Shared styles and UI behavior in `css/` and `js/`
- Cloudflare Pages deployment output in `pages-dist/`
- Cloudflare Worker integration in `cloudflare-worker/`
- Firebase Functions and rules in `functions/`, `firestore.rules`, and `storage.rules`

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Cloudflare Pages
- Cloudflare Workers
- Firebase Functions
- Firebase Firestore and Storage rules

## Project Structure

- `index.html` - homepage
- `shop.html` - product catalog
- `contact.html` - support and contact page
- `blog.html` - blog listing
- `auth.html` - sign in and sign up
- `admin-*.html` - admin tools
- `css/style.css` - global styling
- `js/` - site behavior and page scripts
- `pages-dist/` - deploy-ready Pages output
- `cloudflare-worker/` - payments or API worker
- `functions/` - Firebase backend functions

## Local Development

Because this is a static site with supporting backend folders, the simplest way to work on it is:

1. Open the project in your editor.
2. Run a local static server from the repo root or from `pages-dist/`.
3. Edit the HTML, CSS, and JavaScript files you want to update.

Example with Python:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Deploying To Cloudflare Pages

Deploy from `pages-dist/` so Wrangler only uploads the static site and does not try to bundle the Firebase `functions/` folder.

```powershell
cd pages-dist
wrangler pages deploy . --project-name beulah-foods-store
```

If you are working on the project root, do not run `wrangler pages deploy` there unless you intentionally want Wrangler to inspect the backend folders too.

## Working With Branches

A simple branch flow for this repo:

- `main` - stable, deploy-ready code
- `style-revamp` - UI and design improvements
- `fix-*` - small targeted fixes

Suggested flow:

```bash
git checkout -b style-revamp
git push -u origin style-revamp
```

When the work is done:

```bash
git checkout main
git merge style-revamp
git push
```

## Configuration Notes

- Update Cloudflare Pages settings to point at `pages-dist/` as the build output if you use the dashboard.
- Keep secret keys out of the repo.
- Review `js/backend-config.js` and worker config files before deployment.

## License And Attribution

This repo is licensed under the terms in [`LICENSE`](./LICENSE).
If you reuse or adapt this project, please keep the attribution notice intact and credit Beulah Foods.

## Need A Hand?

If you want to keep polishing the design, the best next edits are usually:

- homepage hero and section spacing
- product card styling
- footer and contact page polish
- admin page consistency

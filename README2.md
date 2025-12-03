+52
-2

# LegoLocker

Frontend for tracking LEGO sets, parts, and wishlist items with Firebase sync and Rebrickable search.

## Project layout
- `web/` – static frontend assets
  - `index.html` – UI with tabs for inventory, set search, and wishlist
  - `assets/css/styles.css` – styling
  - `assets/js/config.js` – client config (overwritten in Docker from environment)
  - `assets/js/config.template.js` – envsubst template used by Docker
  - `assets/js/app.js` – UI interactions, Firebase auth/firestore hooks, and Rebrickable search
- `docker/entrypoint.sh` – generates `config.js` from env vars before starting nginx
- `Dockerfile` – serves the static site via nginx

## Configuration
Set the following environment variables (Docker will inject them into `config.js`):

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `REBRICKABLE_API_KEY`

For local, non-Docker usage, edit `web/assets/js/config.js` directly and open `web/index.html` in a browser or serve with any static file server.

## Docker build and run
Build the image:

```bash
docker build -t legolocker .
```

Run the container (pass your Firebase/Rebrickable env vars as needed):

```bash
docker run -p 8080:80 \
  -e FIREBASE_API_KEY=... \
  -e FIREBASE_AUTH_DOMAIN=... \
  -e FIREBASE_PROJECT_ID=... \
  -e FIREBASE_STORAGE_BUCKET=... \
  -e FIREBASE_MESSAGING_SENDER_ID=... \
  -e FIREBASE_APP_ID=... \
  -e REBRICKABLE_API_KEY=... \
  legolocker
```

Then open http://localhost:8080/ to use the app.

## Testing
Testing not run (read-only QA review).

# LegoLocker

Frontend for tracking LEGO sets, parts, and wishlist items with in-browser SQLite (sql.js) storage and Rebrickable search.

## Project layout
- `web/` – static frontend assets
  - `index.html` – UI with tabs for inventory, set search, and wishlist
  - `assets/css/styles.css` – styling
  - `assets/js/config.js` – client config (overwritten in Docker from environment)
  - `assets/js/config.template.js` – envsubst template used by Docker
  - `assets/js/app.js` – UI interactions, in-browser SQLite persistence, and Rebrickable search
- `docker/entrypoint.sh` – generates `config.js` from env vars before starting nginx
- `Dockerfile` – serves the static site via nginx

Inventory and wishlist data are stored in the browser using sql.js (SQLite compiled to WebAssembly) and persisted to a `.db` file on the browser's Origin Private File System (File System Access API). Browsers without File System Access support will still run but keep data in-memory for the session only. Use the **Reset data** button in the header to clear the database and restore the starter records.

## Configuration
Set the following environment variable (Docker will inject it into `config.js`):

- `REBRICKABLE_API_KEY`

For local, non-Docker usage, edit `web/assets/js/config.js` directly and open `web/index.html` in a browser or serve with any static file server.

## Docker build and run
Build the image:

```bash
docker build -t legolocker .
```

Run the container (pass your Rebrickable env var as needed):

```bash
docker run -p 8080:80 \
  -e REBRICKABLE_API_KEY=... \
  legolocker
```

Then open http://localhost:8080/ to use the app.

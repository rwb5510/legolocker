# LegoLocker - Local Collection Manager

A self-contained, Dockerized web application to manage your Lego collection, wishlist, purchases, and parts inventory.

## Features
* Local Database: Uses SQLite stored in a local file (data/lego.db). No cloud account required.
* Rebrickable Integration: Sync set details, parts lists, and minifigures using the Rebrickable API.
* Purchase Tracking: Log purchases and link them to specific sets.
* Metadata Management: Customize your store lists, statuses, and storage locations.
* Barcode Scanner: Use your device's camera to add sets quickly.

## Prerequisites
Docker and Docker Compose installed.
A free API Key from [Rebrickable](https://rebrickable.com/api/).

1. Run the application:
```
docker compose up -d
```
2. Open in Browser:Go to `http://localhost:3000`
3. Configure API Key:Click the Gear Icon in the top right corner and paste your Rebrickable API Key.
  
## Data Persistence
Your database is stored in the `./data` directory on your host machine. This folder is mounted into the container, so your collection data persists even if you delete the container.

## Development
To run without Docker:
1. `npm install`
2. `node server.js`


---
## Structure

```
lego-locker/
├── public/
│   └── index.html      # The modified web app
├── data/               # Directory for persistent DB storage
│   └── lego.db         # (Created automatically at runtime)
├── Dockerfile
├── compose.yml
├── package.json
├── server.js           # The backend API
└── README.md
```
---

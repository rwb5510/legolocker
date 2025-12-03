const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'lego.db');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// We use a generic schema to mimic Firestore's flexibility
// collection: 'sets', 'purchases', or 'metadata'
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER,
    PRIMARY KEY (collection, id)
  )
`);

// --- Generic API Helpers ---

// GET all items in a collection
app.get('/api/:collection', (req, res) => {
    const { collection } = req.params;
    try {
        const rows = db.prepare('SELECT id, data FROM documents WHERE collection = ?').all(collection);
        const results = rows.map(row => {
            const parsed = JSON.parse(row.data);
            return { id: row.id, ...parsed };
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET specific item
app.get('/api/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    try {
        const row = db.prepare('SELECT data FROM documents WHERE collection = ? AND id = ?').get(collection, id);
        if (row) {
            res.json({ id, ...JSON.parse(row.data) });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE new item
app.post('/api/:collection', (req, res) => {
    const { collection } = req.params;
    const data = req.body;
    const id = crypto.randomUUID(); // Generate ID if creating new
    const timestamp = Date.now();

    try {
        db.prepare('INSERT INTO documents (collection, id, data, created_at) VALUES (?, ?, ?, ?)')
          .run(collection, id, JSON.stringify(data), timestamp);
        res.json({ id, ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE specific item (or create with specific ID)
app.put('/api/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    const data = req.body;
    
    // For specific "metadata" singletons, we might get partial updates, 
    // but for simplicity, we'll do a full replace or merge logic in frontend.
    // Here we act as a "Set/Update".
    
    try {
        // Check if exists to preserve created_at or decide insert/update
        const exists = db.prepare('SELECT 1 FROM documents WHERE collection = ? AND id = ?').get(collection, id);
        
        if (exists) {
            db.prepare('UPDATE documents SET data = ? WHERE collection = ? AND id = ?')
              .run(JSON.stringify(data), collection, id);
        } else {
            db.prepare('INSERT INTO documents (collection, id, data, created_at) VALUES (?, ?, ?, ?)')
              .run(collection, id, JSON.stringify(data), Date.now());
        }
        res.json({ id, ...data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE item
app.delete('/api/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    try {
        db.prepare('DELETE FROM documents WHERE collection = ? AND id = ?').run(collection, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`LegoLocker running at http://localhost:${PORT}`);
    console.log(`Data stored in ${DB_PATH}`);
});

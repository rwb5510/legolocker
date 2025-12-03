import initSqlJs from "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";

const ui = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.tab-panel'),
  addModal: document.getElementById('add-modal'),
  openAdd: document.getElementById('open-add'),
  addForm: document.getElementById('add-form'),
  inventoryGrid: document.getElementById('inventory-grid'),
  wishlistList: document.getElementById('wishlist-list'),
  listTemplate: document.getElementById('list-item-template'),
  cardTemplate: document.getElementById('inventory-card-template'),
  databaseStatus: document.getElementById('database-status'),
  rebrickableStatus: document.getElementById('rebrickable-status'),
  searchButton: document.getElementById('search-button'),
  searchInput: document.getElementById('set-search'),
  setResults: document.getElementById('set-results'),
  resetData: document.getElementById('reset-data'),
  toast: createToast(),
};

let db;
let dbFileHandle;
let SQL;
const config = window.LEGOLOCKER_CONFIG || {};
const dbFileName = 'legolocker.db';

const defaultInventory = [
  { id: '75192', name: 'Millennium Falcon (UCS)', type: 'set', quantity: 1, notes: 'Stored on display shelf.' },
  { id: '21336', name: 'The Office', type: 'set', quantity: 1, notes: 'Missing stapler piece, needs replacement.' },
  { id: '3001', name: 'Brick 2 x 4', type: 'part', quantity: 64, notes: 'Bulk lot for MOCs.' },
];

const defaultWishlist = [
  { id: '10316', title: 'The Lord of the Rings: Rivendell', subtitle: 'Notify me when discounted.' },
  { id: '31154', title: 'Forest Animals: Red Fox', subtitle: 'Great parts pack for orange slopes.' },
];

async function getDatabaseFileHandle() {
  if (!self?.navigator?.storage?.getDirectory) return null;
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(dbFileName, { create: true });
}

async function readPersistedDatabase() {
  if (!dbFileHandle) return null;
  const file = await dbFileHandle.getFile();
  if (!file || file.size === 0) return null;
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function persistDb() {
  if (!db || !dbFileHandle?.createWritable) return;
  const data = db.export();
  const writable = await dbFileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

function asWishlistItem(item) {
  return { id: item.id, title: item.title, subtitle: item.subtitle };
}

function createToast() {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="title"></div><div class="message"></div>`;
  document.body.appendChild(toast);
  return toast;
}

function showToast(title, message) {
  const titleNode = ui.toast.querySelector('.title');
  const messageNode = ui.toast.querySelector('.message');
  titleNode.textContent = title;
  messageNode.textContent = message;
  ui.toast.classList.add('visible');
  setTimeout(() => ui.toast.classList.remove('visible'), 3200);
}

function setActiveTab(id) {
  ui.tabs.forEach((tab) => {
@@ -269,56 +245,58 @@ function renderSetResults(results) {
    return;
  }

  results.forEach((result) => {
    const node = ui.listTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.list-title').textContent = `${result.set_num} • ${result.name}`;
    node.querySelector('.list-subtitle').textContent = `${result.year} • ${result.num_parts} parts`;
    const actions = node.querySelector('.list-actions');
    const saveButton = document.createElement('button');
    saveButton.className = 'primary small';
    saveButton.textContent = 'Add to inventory';
    saveButton.addEventListener('click', async () => {
      const item = { id: result.set_num, name: result.name, type: 'set', quantity: 1, notes: 'Imported from Rebrickable.' };
      await persistInventoryItem(item);
      renderInventory(loadInventory());
      showToast('Inventory updated', `${result.set_num} added`);
      if (db && auth?.currentUser) {
        const inventoryRef = collection(db, 'inventory');
        await addDoc(inventoryRef, { ...item, userId: auth.currentUser.uid, createdAt: Date.now() });
      }
    });
    actions.appendChild(saveButton);
    ui.setResults.appendChild(node);
  });
}

async function initDatabase() {
  ui.databaseStatus.textContent = 'Loading database...';
  SQL = await initSqlJs({ locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}` });
  dbFileHandle = await getDatabaseFileHandle();
  const persisted = await readPersistedDatabase();
  db = persisted ? new SQL.Database(persisted) : new SQL.Database();
  createTables();
  await ensureDefaults();
  ui.databaseStatus.textContent = dbFileHandle
    ? 'SQLite file ready (persisted on disk)'
    : 'SQLite ready (File System Access unavailable; changes stay in-memory)';
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT,
      name TEXT,
      type TEXT,
      quantity INTEGER,
      notes TEXT,
      createdAt INTEGER
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT,
      title TEXT,
      subtitle TEXT,
      createdAt INTEGER
    );
  `);
}

async function ensureDefaults() {
  if (!db) return;

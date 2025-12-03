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
let SQL;
const config = window.LEGOLOCKER_CONFIG || {};
const dbDirectory = '/persist';
const dbPath = `${dbDirectory}/legolocker.db`;

const defaultInventory = [
  { id: '75192', name: 'Millennium Falcon (UCS)', type: 'set', quantity: 1, notes: 'Stored on display shelf.' },
  { id: '21336', name: 'The Office', type: 'set', quantity: 1, notes: 'Missing stapler piece, needs replacement.' },
  { id: '3001', name: 'Brick 2 x 4', type: 'part', quantity: 64, notes: 'Bulk lot for MOCs.' },
];

const defaultWishlist = [
  { id: '10316', title: 'The Lord of the Rings: Rivendell', subtitle: 'Notify me when discounted.' },
  { id: '31154', title: 'Forest Animals: Red Fox', subtitle: 'Great parts pack for orange slopes.' },
];

function syncFilesystem(populateFromIndexedDb = false) {
  return new Promise((resolve, reject) => {
    SQL.FS.syncfs(populateFromIndexedDb, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function initFilesystem() {
  if (!SQL?.FS?.mount || !SQL?.IDBFS) return;
  try {
    SQL.FS.mkdir(dbDirectory);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  SQL.FS.mount(SQL.IDBFS, {}, dbDirectory);
  await syncFilesystem(true);
}

function readPersistedDatabase() {
  try {
    const file = SQL.FS.readFile(dbPath);
    if (file?.length) {
      return file;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to read persisted database', error);
    }
  }
  return null;
}

async function persistDb() {
  if (!db) return;
  const data = db.export();
  SQL.FS.writeFile(dbPath, data);
  await syncFilesystem(false);
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
    const isActive = tab.dataset.tab === id;
    tab.classList.toggle('active', isActive);
@@ -95,84 +143,84 @@ function renderInventory(items) {
    }));
    ui.inventoryGrid.appendChild(card);
  });
}

function renderWishlist(items) {
  ui.wishlistList.innerHTML = '';
  items.forEach((item) => ui.wishlistList.appendChild(createWishlistNode(item)));
}

async function addWishlistItem(item) {
  const persisted = await persistWishlistItem(item);
  ui.wishlistList.prepend(createWishlistNode(persisted));
  showToast('Added to wishlist', `${item.title} saved`);
}

function createWishlistNode(item) {
  const node = ui.listTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.list-title').textContent = item.title;
  node.querySelector('.list-subtitle').textContent = item.subtitle;
  const actions = node.querySelector('.list-actions');

  const purchaseButton = document.createElement('button');
  purchaseButton.className = 'primary small';
  purchaseButton.textContent = 'Mark acquired';
  purchaseButton.addEventListener('click', async () => {
    node.remove();
    await handleWishlistRemoval(item, `${item.title} marked as acquired`);
  });

  const removeButton = document.createElement('button');
  removeButton.className = 'ghost small';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', async () => {
    node.remove();
    await handleWishlistRemoval(item, `${item.title} removed`);
  });

  actions.appendChild(purchaseButton);
  actions.appendChild(removeButton);
  return node;
}

async function persistWishlistItem(item) {
  if (!db) return item;
  db.run(
    'INSERT INTO wishlist (id, title, subtitle, createdAt) VALUES (?, ?, ?, ?)',
    [item.id, item.title, item.subtitle, Date.now()],
  );
  await persistDb();
  const rowId = db.exec('SELECT last_insert_rowid() as rowId')[0]?.values[0][0];
  return { ...item, rowId };
}

async function handleWishlistRemoval(item, message) {
  showToast('Wishlist updated', message);
  if (!db || !item?.rowId) return;
  db.run('DELETE FROM wishlist WHERE rowid = ?', [item.rowId]);
  await persistDb();
}

function bindTabs() {
  ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });
}

function bindModals() {
  ui.openAdd.addEventListener('click', () => toggleModal(ui.addModal, true));
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('.modal').setAttribute('hidden', ''));
  });
}

function bindAddForm() {
  ui.addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const item = {
      type: document.getElementById('item-type').value,
      name: document.getElementById('item-name').value,
      id: document.getElementById('item-number').value,
      quantity: Number(document.getElementById('item-quantity').value) || 1,
      notes: document.getElementById('item-notes').value,
    };
@@ -184,207 +232,174 @@ function bindAddForm() {
  });
}

function bindSearch() {
  ui.searchButton.addEventListener('click', runSearch);
  ui.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });
}

async function runSearch() {
  const term = ui.searchInput.value.trim();
  if (!term) return;

  const apiKey = config.rebrickableApiKey;
  if (!apiKey) {
    ui.rebrickableStatus.textContent = 'Set REBRICKABLE_API_KEY to search';
    return;
  }
  ui.rebrickableStatus.textContent = 'Searching...';

  const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/?search=${encodeURIComponent(term)}&page_size=10`, {
  }
  const data = await response.json();
  renderSetResults(data.results || []);
  ui.rebrickableStatus.textContent = `Found ${data.count || data.results?.length || 0} result(s)`;
}

function renderSetResults(results) {
  ui.setResults.innerHTML = '';
  if (!results.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No sets found. Try a different query.';
    ui.setResults.appendChild(empty);
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
    });
    actions.appendChild(saveButton);
    ui.setResults.appendChild(node);
  });
}

async function initDatabase() {
  ui.databaseStatus.textContent = 'Loading database...';
  SQL = await initSqlJs({ locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}` });
  await initFilesystem();
  const persisted = readPersistedDatabase();
  db = persisted ? new SQL.Database(persisted) : new SQL.Database();
  createTables();
  await ensureDefaults();
  ui.databaseStatus.textContent = 'SQLite file (IndexedDB-backed) ready';
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
  const inventoryCount = getCount('inventory');
  if (!inventoryCount) {
    defaultInventory.forEach((item) => {
      db.run(
        'INSERT INTO inventory (id, name, type, quantity, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [item.id, item.name, item.type, item.quantity, item.notes, Date.now()],
      );
    });
  }
  const wishlistCount = getCount('wishlist');
  if (!wishlistCount) {
    defaultWishlist.forEach((item) => {
      db.run(
        'INSERT INTO wishlist (id, title, subtitle, createdAt) VALUES (?, ?, ?, ?)',
        [item.id, item.title, item.subtitle, Date.now()],
      );
    });
  }
  await persistDb();
}

function getCount(table) {
  const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`);
  if (!result.length) return 0;
  const [[count]] = result[0].values;
  return Number(count) || 0;
}

async function persistInventoryItem(item) {
  if (!db) return item;
  db.run(
    'INSERT INTO inventory (id, name, type, quantity, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [item.id, item.name, item.type, item.quantity, item.notes, Date.now()],
  );
  await persistDb();
  const rowId = db.exec('SELECT last_insert_rowid() as rowId')[0]?.values[0][0];
  return { ...item, rowId };
}

function loadInventory() {
  if (!db) return defaultInventory;
  const result = db.exec('SELECT rowid as rowId, id, name, type, quantity, notes FROM inventory ORDER BY createdAt DESC');
  if (!result.length) return defaultInventory;
  return result[0].values.map(([rowId, id, name, type, quantity, notes]) => ({ rowId, id, name, type, quantity, notes }));
}

function loadWishlist() {
  if (!db) return defaultWishlist.map(asWishlistItem);
  const result = db.exec('SELECT rowid as rowId, id, title, subtitle FROM wishlist ORDER BY createdAt DESC');
  if (!result.length) return defaultWishlist.map(asWishlistItem);
  return result[0].values.map(([rowId, id, title, subtitle]) => ({ rowId, id, title, subtitle }));
}

function bindReset() {
  if (!ui.resetData) return;
  ui.resetData.addEventListener('click', async () => {
    if (!SQL) return;
    db = new SQL.Database();
    createTables();
    await ensureDefaults();
    renderInventory(loadInventory());
    renderWishlist(loadWishlist());
    showToast('Storage reset', 'Database restored to starter data');
  });
}

async function init() {
  bindTabs();
  bindModals();
  bindAddForm();
  bindSearch();
  bindReset();
  await initDatabase();
  renderInventory(loadInventory());
  renderWishlist(loadWishlist());
  if (config.rebrickableApiKey) {
    ui.rebrickableStatus.textContent = 'Rebrickable ready';
  }
}

init();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const ui = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.tab-panel'),
  addModal: document.getElementById('add-modal'),
  authModal: document.getElementById('auth-modal'),
  openAdd: document.getElementById('open-add'),
  openAuth: document.getElementById('open-auth'),
  addForm: document.getElementById('add-form'),
  inventoryGrid: document.getElementById('inventory-grid'),
  wishlistList: document.getElementById('wishlist-list'),
  listTemplate: document.getElementById('list-item-template'),
  cardTemplate: document.getElementById('inventory-card-template'),
  firebaseStatus: document.getElementById('firebase-status'),
  rebrickableStatus: document.getElementById('rebrickable-status'),
  searchButton: document.getElementById('search-button'),
  searchInput: document.getElementById('set-search'),
  setResults: document.getElementById('set-results'),
  authForm: document.getElementById('auth-form'),
  toast: createToast(),
};

let auth;
let db;
const config = window.LEGOLOCKER_CONFIG || {};

const defaultInventory = [
  { id: '75192', name: 'Millennium Falcon (UCS)', type: 'set', quantity: 1, notes: 'Stored on display shelf.' },
  { id: '21336', name: 'The Office', type: 'set', quantity: 1, notes: 'Missing stapler piece, needs replacement.' },
  { id: '3001', name: 'Brick 2 x 4', type: 'part', quantity: 64, notes: 'Bulk lot for MOCs.' },
];

const defaultWishlist = [
  { id: '10316', title: 'The Lord of the Rings: Rivendell', subtitle: 'Notify me when discounted.' },
  { id: '31154', title: 'Forest Animals: Red Fox', subtitle: 'Great parts pack for orange slopes.' },
];

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
    tab.setAttribute('aria-selected', String(isActive));
  });
  ui.panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === id);
  });
}

function toggleModal(modal, show) {
  if (show) {
    modal.removeAttribute('hidden');
  } else {
    modal.setAttribute('hidden', '');
  }
}

function renderInventory(items) {
  ui.inventoryGrid.innerHTML = '';
  items.forEach((item) => {
    const card = ui.cardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector('.card-title').textContent = item.name;
    card.querySelector('.card-note').textContent = item.notes || 'No notes yet.';
    card.querySelector('.quantity').textContent = item.quantity;
    card.querySelector('.type-pill').textContent = item.type;
    card.querySelector('.type-pill').classList.add(`pill-${item.type}`);
    card.querySelector('.id-pill').textContent = item.id;
    card.querySelector('.add-to-wishlist').addEventListener('click', () => addWishlistItem({
      id: item.id,
      title: item.name,
      subtitle: `${item.type.toUpperCase()} • ${item.quantity} pcs`,
    }));
    ui.inventoryGrid.appendChild(card);
  });
}

function renderWishlist(items) {
  ui.wishlistList.innerHTML = '';
  items.forEach((item) => {
    const node = ui.listTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.list-title').textContent = item.title;
    node.querySelector('.list-subtitle').textContent = item.subtitle;
    const actions = node.querySelector('.list-actions');
    const removeButton = document.createElement('button');
    removeButton.className = 'ghost small';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      node.remove();
      showToast('Wishlist updated', `${item.title} removed`);
    });
    actions.appendChild(removeButton);
    ui.wishlistList.appendChild(node);
  });
}

function addWishlistItem(item) {
  ui.wishlistList.prepend(createWishlistNode(item));
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
  purchaseButton.addEventListener('click', () => {
    node.remove();
    showToast('Wishlist updated', `${item.title} marked as acquired`);
  });
  actions.appendChild(purchaseButton);
  return node;
}

function bindTabs() {
  ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });
}

function bindModals() {
  ui.openAdd.addEventListener('click', () => toggleModal(ui.addModal, true));
  ui.openAuth.addEventListener('click', () => toggleModal(ui.authModal, true));
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

    renderInventory([item, ...getCurrentInventory()]);
    toggleModal(ui.addModal, false);
    showToast('Item saved', `${item.name} added to inventory`);

    if (db && auth?.currentUser) {
      const inventoryRef = collection(db, 'inventory');
      await addDoc(inventoryRef, { ...item, userId: auth.currentUser.uid, createdAt: Date.now() });
    }
  });
}

function getCurrentInventory() {
  return Array.from(ui.inventoryGrid.children).map((node) => ({
    name: node.querySelector('.card-title').textContent,
    notes: node.querySelector('.card-note').textContent,
    quantity: Number(node.querySelector('.quantity').textContent),
    type: node.querySelector('.type-pill').textContent,
    id: node.querySelector('.id-pill').textContent,
  }));
}

function bindAuthForm() {
  ui.authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!auth) {
      showToast('Firebase not configured', 'Add your Firebase environment variables to enable sign-in.');
      return;
    }

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Signed in', `Welcome back, ${email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Account created', 'You are now signed in.');
      } else {
        showToast('Authentication failed', error.message);
      }
    }
    toggleModal(ui.authModal, false);
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
    headers: { Authorization: `key ${apiKey}` },
  });
  if (!response.ok) {
    ui.rebrickableStatus.textContent = 'Request failed';
    showToast('Rebrickable error', `${response.status}: ${response.statusText}`);
    return;
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
    saveButton.addEventListener('click', () => {
      const item = { id: result.set_num, name: result.name, type: 'set', quantity: 1, notes: 'Imported from Rebrickable.' };
      renderInventory([item, ...getCurrentInventory()]);
      showToast('Inventory updated', `${result.set_num} added`);
    });
    actions.appendChild(saveButton);
    ui.setResults.appendChild(node);
  });
}

function configureFirebase() {
  if (!config.firebaseApiKey || !config.firebaseProjectId) {
    ui.firebaseStatus.textContent = 'Set Firebase env vars to sync';
    return;
  }

  const firebaseConfig = {
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.firebaseProjectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId,
  };
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  ui.firebaseStatus.textContent = 'Firebase ready';

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      ui.openAuth.textContent = 'Signed in';
      await loadInventory(user.uid);
      await loadWishlist(user.uid);
    } else {
      ui.openAuth.textContent = 'Sign in';
      renderInventory(defaultInventory);
      renderWishlist(defaultWishlist.map(createWishlistItem));
    }
  });
}

function createWishlistItem(item) {
  return { id: item.id, title: item.title, subtitle: item.subtitle };
}

async function loadInventory(userId) {
  if (!db) return;
  const inventoryRef = collection(db, 'inventory');
  const q = query(inventoryRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    renderInventory(defaultInventory);
    return;
  }
  const items = snapshot.docs.map((doc) => ({
    ...doc.data(),
  }));
  renderInventory(items);
}

async function loadWishlist(userId) {
  if (!db) return;
  const wishlistRef = collection(db, 'wishlist');
  const q = query(wishlistRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    renderWishlist(defaultWishlist.map(createWishlistItem));
    return;
  }
  const items = snapshot.docs.map((doc) => ({ ...doc.data() }));
  renderWishlist(items);
}

function init() {
  bindTabs();
  bindModals();
  bindAddForm();
  bindAuthForm();
  bindSearch();
  renderInventory(defaultInventory);
  renderWishlist(defaultWishlist.map(createWishlistItem));
  configureFirebase();
  if (config.rebrickableApiKey) {
    ui.rebrickableStatus.textContent = 'Rebrickable ready';
  }
}

init();

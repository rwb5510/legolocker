import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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
@@ -73,88 +73,98 @@ function toggleModal(modal, show) {
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
  items.forEach((item) => ui.wishlistList.appendChild(createWishlistNode(item)));
}

async function addWishlistItem(item) {
  ui.wishlistList.prepend(createWishlistNode(item));
  showToast('Added to wishlist', `${item.title} saved`);
  await persistWishlistItem(item);
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
    handleWishlistRemoval(item, `${item.title} marked as acquired`);
  });

  const removeButton = document.createElement('button');
  removeButton.className = 'ghost small';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    node.remove();
    handleWishlistRemoval(item, `${item.title} removed`);
  });

  actions.appendChild(purchaseButton);
  actions.appendChild(removeButton);
  return node;
}

async function persistWishlistItem(item) {
  if (!db || !auth?.currentUser) return;
  const wishlistRef = collection(db, 'wishlist');
  await addDoc(wishlistRef, { ...item, userId: auth.currentUser.uid, createdAt: Date.now() });
}

async function handleWishlistRemoval(item, message) {
  showToast('Wishlist updated', message);
  if (!item.docId || !db) return;
  await deleteDoc(doc(db, 'wishlist', item.docId));
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

@@ -233,54 +243,58 @@ async function runSearch() {
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
    saveButton.addEventListener('click', async () => {
      const item = { id: result.set_num, name: result.name, type: 'set', quantity: 1, notes: 'Imported from Rebrickable.' };
      renderInventory([item, ...getCurrentInventory()]);
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

@@ -303,44 +317,44 @@ function createWishlistItem(item) {

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
  const items = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), docId: docSnap.id }));
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

/* commandes.js
   Gestion des commandes et des livraisons pour La Mouna
   Ce fichier contient:
   - création de commande
   - ajout d'articles
   - gestion des infos client
   - calcul des frais de livraison
   - modèle d'envoi EmailJS (à personnaliser)
*/

const zoneRules = {
  beaumont: { label: 'Beaumont', fee: 0, freeThreshold: 0, description: 'Livraison gratuite' },
  clermont: { label: 'Clermont', fee: 2, freeThreshold: 30, description: '2€ si commande < 30€, gratuit dès 30€' },
  entite: { label: 'Villages entité', fee: 2, freeThreshold: 30, description: '2€ si commande < 30€, gratuit dès 30€' },
  grandrieu: { label: 'Grand-Rieu', fee: 2, freeThreshold: 30, description: '2€ si commande < 30€, gratuit dès 30€' },
  vergnies: { label: 'Vergnies', fee: 2, freeThreshold: 30, description: '2€ si commande < 30€, gratuit dès 30€' },
  sivry: { label: 'Sivry', fee: 3, freeThreshold: 30, description: '3€ si commande < 30€, gratuit dès 30€' },
  bousignies: { label: 'Bousignies-sur-Roc', fee: 3, freeThreshold: 30, description: '3€ si commande < 30€, gratuit dès 30€' },
  rance: { label: 'Rance', fee: 4, freeThreshold: 30, description: '4€ si commande < 30€, gratuit dès 30€' },
  sautin: { label: 'Sautin', fee: 4, freeThreshold: 30, description: '4€ si commande < 30€, gratuit dès 30€' },
  froidchapelle: { label: 'Froidchapelle', fee: 4, freeThreshold: 30, description: '4€ si commande < 30€, gratuit dès 30€' }
};

const state = {
  orders: [],
  activeOrderId: null,
  orderCounter: 0
};

const elements = {
  headerDate: document.getElementById('headerDate'),
  orderCount: document.getElementById('orderCount'),
  btnNewOrder: document.getElementById('btnNewOrder'),
  orderList: document.getElementById('orderList'),
  menuSearch: document.getElementById('menuSearch'),
  searchClear: document.getElementById('searchClear'),
  categoryTabs: document.getElementById('categoryTabs'),
  menuGrid: document.getElementById('menuGrid'),
  ticketPlaceholder: document.getElementById('ticketPlaceholder'),
  ticketActive: document.getElementById('ticketActive'),
  ticketTitle: document.getElementById('ticketTitle'),
  ticketTime: document.getElementById('ticketTime'),
  fieldPrenom: document.getElementById('fieldPrenom'),
  fieldNom: document.getElementById('fieldNom'),
  fieldTel: document.getElementById('fieldTel'),
  fieldZone: document.getElementById('fieldZone'),
  fieldAdresse: document.getElementById('fieldAdresse'),
  deliveryBlock: document.getElementById('deliveryBlock'),
  deliveryInfoBox: document.getElementById('deliveryInfoBox'),
  fieldDate: document.getElementById('fieldDate'),
  fieldHeure: document.getElementById('fieldHeure'),
  ticketLines: document.getElementById('ticketLines'),
  totalsBlock: document.getElementById('totalsBlock'),
  totalSub: document.getElementById('totalSub'),
  surchargeRow: document.getElementById('surchargeRow'),
  totalDelivery: document.getElementById('totalDelivery'),
  totalGrand: document.getElementById('totalGrand'),
  paymentRow: document.getElementById('paymentRow'),
  fieldNotes: document.getElementById('fieldNotes'),
  btnPrint: document.getElementById('btnPrint'),
  btnDeleteOrder: document.getElementById('btnDeleteOrder'),
  toast: document.getElementById('toast')
};

const emailConfig = {
  serviceId: 'your_service_id',
  templateId: 'your_template_id',
  publicKey: 'your_public_key',
  fromEmail: 'commande@votrepizzeria.com',
  toEmail: 'votreadresse@exemple.com'
};

function formatPrice(value) {
  return value.toFixed(2).replace('.', ',') + ' €';
}

function parsePrice(value) {
  return Number(value) || 0;
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

function showToast(message, duration = 2500) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(elements.toast._timeout);
  elements.toast._timeout = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, duration);
}

function getActiveOrder() {
  return state.orders.find(order => order.id === state.activeOrderId) || null;
}

function createOrder() {
  const id = ++state.orderCounter;
  const order = {
    id,
    createdAt: new Date().toISOString(),
    service: 'emporter',
    payment: 'cash',
    client: {
      prenom: '',
      nom: '',
      tel: '',
      zone: 'beaumont',
      adresse: '',
      date: getTodayDate(),
      heure: getCurrentTime(),
      notes: ''
    },
    items: []
  };
  state.orders.unshift(order);
  state.activeOrderId = id;
  refreshUi();
  showToast('Nouvelle commande créée');
}

function deleteOrder(id) {
  const index = state.orders.findIndex(order => order.id === id);
  if (index === -1) return;
  state.orders.splice(index, 1);
  if (state.activeOrderId === id) {
    state.activeOrderId = state.orders.length ? state.orders[0].id : null;
  }
  refreshUi();
  showToast('Commande supprimée');
}

function selectOrder(id) {
  state.activeOrderId = id;
  refreshUi();
}

function updateOrderFromFields() {
  const order = getActiveOrder();
  if (!order) return;
  order.client.prenom = elements.fieldPrenom.value.trim();
  order.client.nom = elements.fieldNom.value.trim();
  order.client.tel = elements.fieldTel.value.trim();
  order.client.zone = elements.fieldZone.value;
  order.client.adresse = elements.fieldAdresse.value.trim();
  order.client.date = elements.fieldDate.value;
  order.client.heure = elements.fieldHeure.value;
  order.client.notes = elements.fieldNotes.value.trim();
  refreshUi();
}

function setService(service) {
  const order = getActiveOrder();
  if (!order) return;
  order.service = service;
  refreshUi();
}

function setPayment(payment) {
  const order = getActiveOrder();
  if (!order) return;
  order.payment = payment;
  refreshUi();
}

function addItemToOrder(itemData) {
  const order = getActiveOrder();
  if (!order) {
    showToast('Créez d’abord une commande');
    return;
  }

  const existing = order.items.find(item => item.name === itemData.name && item.price === itemData.price);
  if (existing) {
    existing.quantity += 1;
  } else {
    order.items.push({ ...itemData, quantity: 1 });
  }
  refreshUi();
}

function removeItem(order, idx) {
  order.items.splice(idx, 1);
  refreshUi();
}

function updateItemQuantity(order, idx, delta) {
  const item = order.items[idx];
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    order.items.splice(idx, 1);
  }
  refreshUi();
}

function calculateTotals(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let surcharge = 0;
  let deliveryMessage = 'Pas de livraison sélectionnée';
  if (order.service === 'livraison') {
    const zone = zoneRules[order.client.zone] || zoneRules.beaumont;
    if (zone.fee === 0) {
      surcharge = 0;
      deliveryMessage = 'Livraison gratuite à Beaumont';
    } else if (subtotal >= zone.freeThreshold) {
      surcharge = 0;
      deliveryMessage = `${zone.label} : gratuit à partir de ${formatPrice(zone.freeThreshold)}`;
    } else {
      surcharge = zone.fee;
      deliveryMessage = `${zone.label} : +${formatPrice(zone.fee)} de livraison (${zone.description})`;
    }
  }
  return {
    subtotal,
    surcharge,
    total: subtotal + surcharge,
    deliveryMessage
  };
}

function buildOrderCard(order) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'order-card';
  card.dataset.orderId = order.id;
  if (order.id === state.activeOrderId) {
    card.classList.add('active');
  }
  const totals = calculateTotals(order);
  card.innerHTML = `
    <strong>Commande #${order.id}</strong>
    <span>${order.items.length} article(s)</span>
    <span>${formatPrice(totals.total)}</span>
  `;
  card.addEventListener('click', () => selectOrder(order.id));
  return card;
}

function renderOrderList() {
  elements.orderList.innerHTML = '';
  if (!state.orders.length) {
    elements.orderList.innerHTML = '<p class="list-empty">Aucune commande ouverte.</p>';
    return;
  }
  state.orders.forEach(order => elements.orderList.appendChild(buildOrderCard(order)));
}

function renderTicket(order) {
  if (!order) {
    elements.ticketPlaceholder.style.display = 'flex';
    elements.ticketActive.style.display = 'none';
    return;
  }

  elements.ticketPlaceholder.style.display = 'none';
  elements.ticketActive.style.display = 'block';
  elements.ticketTitle.textContent = `Commande #${order.id}`;
  elements.ticketTime.textContent = `Créée le ${new Date(order.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`;
  elements.fieldPrenom.value = order.client.prenom;
  elements.fieldNom.value = order.client.nom;
  elements.fieldTel.value = order.client.tel;
  elements.fieldZone.value = order.client.zone;
  elements.fieldAdresse.value = order.client.adresse;
  elements.fieldDate.value = order.client.date || getTodayDate();
  elements.fieldHeure.value = order.client.heure || getCurrentTime();
  elements.fieldNotes.value = order.client.notes || '';

  const serviceButtons = Array.from(document.querySelectorAll('.svc-btn'));
  serviceButtons.forEach(button => button.classList.toggle('active', button.dataset.svc === order.service));
  elements.deliveryBlock.style.display = order.service === 'livraison' ? 'block' : 'none';

  const paymentButtons = Array.from(document.querySelectorAll('.pay-btn'));
  paymentButtons.forEach(button => button.classList.toggle('active', button.dataset.pay === order.payment));

  if (!order.items.length) {
    elements.ticketLines.innerHTML = '<p class="ticket-empty">Cliquez sur un article du menu pour l’ajouter.</p>';
    elements.totalsBlock.style.display = 'none';
  } else {
    elements.totalsBlock.style.display = 'block';
    elements.ticketLines.innerHTML = '';
    order.items.forEach((item, idx) => {
      const line = document.createElement('div');
      line.className = 'ticket-line';
      line.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <small>${formatPrice(item.price)} x ${item.quantity}</small>
        </div>
        <div class="line-actions">
          <button type="button" class="qty-btn" data-action="minus">−</button>
          <span>${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="plus">+</button>
          <button type="button" class="remove-btn">✕</button>
        </div>
      `;
      line.querySelector('[data-action="minus"]').addEventListener('click', () => updateItemQuantity(order, idx, -1));
      line.querySelector('[data-action="plus"]').addEventListener('click', () => updateItemQuantity(order, idx, 1));
      line.querySelector('.remove-btn').addEventListener('click', () => removeItem(order, idx));
      elements.ticketLines.appendChild(line);
    });
  }

  const totals = calculateTotals(order);
  elements.totalSub.textContent = formatPrice(totals.subtotal);
  elements.totalGrand.textContent = formatPrice(totals.total);
  if (order.service === 'livraison' && totals.surcharge > 0) {
    elements.surchargeRow.style.display = 'flex';
    elements.totalDelivery.textContent = `+${formatPrice(totals.surcharge)}`;
  } else {
    elements.surchargeRow.style.display = 'none';
    elements.totalDelivery.textContent = '+0,00 €';
  }
  elements.deliveryInfoBox.textContent = totals.deliveryMessage;
}

function refreshUi() {
  renderOrderList();
  renderTicket(getActiveOrder());
  elements.orderCount.textContent = `${state.orders.length} commande(s)`;
}

function initSearch() {
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  elements.menuSearch.addEventListener('input', () => {
    const query = elements.menuSearch.value.trim().toLowerCase();
    elements.searchClear.style.display = query ? 'block' : 'none';
    menuItems.forEach(button => {
      const name = button.dataset.name.toLowerCase();
      const cat = button.dataset.cat.toLowerCase();
      const visible = !query || name.includes(query) || cat.includes(query);
      button.style.display = visible ? 'flex' : 'none';
    });
  });
  elements.searchClear.addEventListener('click', () => {
    elements.menuSearch.value = '';
    elements.searchClear.style.display = 'none';
    menuItems.forEach(button => button.style.display = 'flex');
  });
}

function initCategories() {
  const tabs = Array.from(document.querySelectorAll('.cat-tab'));
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(button => button.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.dataset.cat;
      const items = Array.from(document.querySelectorAll('.menu-item, .menu-category-label'));
      items.forEach(item => {
        const itemCat = item.dataset.cat;
        const show = category === 'all' || itemCat === category;
        item.style.display = show ? 'flex' : 'none';
      });
    });
  });
}

function initMenuItems() {
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  menuItems.forEach(button => {
    button.addEventListener('click', () => {
      addItemToOrder({
        name: button.dataset.name,
        price: parsePrice(button.dataset.price)
      });
    });
  });
}

function initServiceButtons() {
  const buttons = Array.from(document.querySelectorAll('.svc-btn'));
  buttons.forEach(button => {
    button.addEventListener('click', () => setService(button.dataset.svc));
  });
}

function initPaymentButtons() {
  const buttons = Array.from(document.querySelectorAll('.pay-btn'));
  buttons.forEach(button => {
    button.addEventListener('click', () => setPayment(button.dataset.pay));
  });
}

function initFieldListeners() {
  const fields = [
    elements.fieldPrenom,
    elements.fieldNom,
    elements.fieldTel,
    elements.fieldZone,
    elements.fieldAdresse,
    elements.fieldDate,
    elements.fieldHeure,
    elements.fieldNotes
  ];
  fields.forEach(field => field.addEventListener('input', updateOrderFromFields));
  elements.fieldZone.addEventListener('change', updateOrderFromFields);
}

function initActions() {
  elements.btnNewOrder.addEventListener('click', createOrder);
  elements.btnDeleteOrder.addEventListener('click', () => {
    const active = getActiveOrder();
    if (!active) return;
    deleteOrder(active.id);
  });
  elements.btnPrint.addEventListener('click', () => {
    const order = getActiveOrder();
    if (!order) {
      showToast('Aucune commande à imprimer');
      return;
    }
    if (emailConfig.serviceId.includes('your_') || emailConfig.templateId.includes('your_') || emailConfig.publicKey.includes('your_')) {
      showToast('Configurez EmailJS dans commandes.js avant l’envoi');
    } else {
      sendOrderByEmail(order);
    }
    window.print();
  });
}

function renderOrderItemsForEmail(order) {
  return order.items.map(item => `${item.quantity} × ${item.name} (${formatPrice(item.price)})`).join('\n');
}

function getEmailTemplateParams(order) {
  const totals = calculateTotals(order);
  return {
    from_email: emailConfig.fromEmail,
    to_email: emailConfig.toEmail,
    client_name: `${order.client.prenom} ${order.client.nom}`.trim() || 'Client',
    client_phone: order.client.tel,
    client_address: order.client.adresse,
    delivery_zone: zoneRules[order.client.zone]?.label || '—',
    service_type: order.service,
    order_id: order.id,
    order_date: order.client.date || getTodayDate(),
    order_time: order.client.heure || getCurrentTime(),
    order_items: renderOrderItemsForEmail(order),
    subtotal: formatPrice(totals.subtotal),
    delivery_fee: formatPrice(totals.surcharge),
    total: formatPrice(totals.total),
    notes: order.client.notes || 'Aucune',
    payment_method: order.payment === 'cash' ? 'Espèces' : 'Virement / QR Code'
  };
}

function sendOrderByEmail(order) {
  if (!window.emailjs || typeof emailjs.send !== 'function') {
    showToast('EmailJS n’est pas chargé. Vérifiez la balise script.');
    return;
  }

  const params = getEmailTemplateParams(order);
  emailjs.send(emailConfig.serviceId, emailConfig.templateId, params, emailConfig.publicKey)
    .then(() => {
      showToast('Commande envoyée par email');
    })
    .catch(error => {
      console.error('EmailJS error', error);
      showToast('Échec de l’envoi EmailJS');
    });
}

function init() {
  elements.headerDate.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  elements.fieldDate.value = getTodayDate();
  elements.fieldHeure.value = getCurrentTime();

  initSearch();
  initCategories();
  initMenuItems();
  initServiceButtons();
  initPaymentButtons();
  initFieldListeners();
  initActions();

  if (!state.orders.length) {
    createOrder();
  } else {
    refreshUi();
  }
}

init();

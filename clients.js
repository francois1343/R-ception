/* ═══════════════════════════════════════════════════════════
   LA MOUNA — Gestion des Clients
   Interface CRUD complète pour gérer les clients
═══════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:3001/api";
let clients = [];
let editingClientId = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Gestion Clients démarrée");
  initializeClients();
  loadClients();
  attachEventListeners();
});

/* ─────────────────────────────────────────────
   INITIALISATION
───────────────────────────────────────────── */

function initializeClients() {
  console.log("✓ Interface clients initialisée");
}

function attachEventListeners() {
  // Bouton ajouter client
  document.getElementById("btnAddClient").addEventListener("click", () => {
    editingClientId = null;
    resetForm();
    document.getElementById("modalTitle").textContent = "Ajouter un Client";
    openModal();
  });

  // Bouton enregistrer
  document
    .getElementById("btnSaveClient")
    .addEventListener("click", saveClient);

  // Bouton annuler
  document
    .getElementById("btnCancelModal")
    .addEventListener("click", closeModal);

  // Recherche
  document
    .getElementById("searchInput")
    .addEventListener("input", filterClients);

  // Fermer modal en cliquant en dehors
  document.getElementById("clientModal").addEventListener("click", (e) => {
    if (e.target.id === "clientModal") {
      closeModal();
    }
  });
}

/* ─────────────────────────────────────────────
   CHARGEMENT DES CLIENTS
───────────────────────────────────────────── */

async function loadClients() {
  try {
    const response = await fetch(`${API_BASE}/clients`);
    if (!response.ok) throw new Error("Erreur chargement clients");

    clients = await response.json();
    console.log(`✓ ${clients.length} client(s) chargé(s)`);
    displayClients(clients);
  } catch (error) {
    console.error("Erreur chargement:", error);
    showNotification("Impossible de charger les clients", "error");
  }
}

/* ─────────────────────────────────────────────
   AFFICHAGE DES CLIENTS
───────────────────────────────────────────── */

function displayClients(clientsToDisplay) {
  const tbody = document.getElementById("clientsTableBody");

  if (!clientsToDisplay || clientsToDisplay.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>📭 Aucun client trouvé</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = clientsToDisplay
    .map((client) => {
      const dateCreation = client.dateCreation
        ? new Date(client.dateCreation).toLocaleDateString("fr-FR")
        : "—";

      return `
      <tr>
        <td><strong>${escapeHtml(client.prenom)}</strong></td>
        <td>${escapeHtml(client.nom)}</td>
        <td>${escapeHtml(client.telephone)}</td>
        <td>${client.adresse ? escapeHtml(client.adresse) : "—"}</td>
        <td>${dateCreation}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-small btn-edit" onclick="editClient('${client.id}')">✏️ Éditer</button>
            <button class="btn-small btn-delete" onclick="deleteClient('${client.id}')">🗑️ Supprimer</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

/* ─────────────────────────────────────────────
   FILTRAGE / RECHERCHE
───────────────────────────────────────────── */

function filterClients() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  if (!searchTerm) {
    displayClients(clients);
    return;
  }

  const filtered = clients.filter((client) => {
    const nom = client.nom.toLowerCase();
    const prenom = client.prenom.toLowerCase();
    const telephone = client.telephone.toLowerCase();
    const adresse = (client.adresse || "").toLowerCase();

    return (
      nom.includes(searchTerm) ||
      prenom.includes(searchTerm) ||
      telephone.includes(searchTerm) ||
      adresse.includes(searchTerm)
    );
  });

  displayClients(filtered);
}

/* ─────────────────────────────────────────────
   AJOUTER/MODIFIER CLIENT
───────────────────────────────────────────── */

async function saveClient() {
  const prenom = document.getElementById("inputPrenom").value.trim();
  const nom = document.getElementById("inputNom").value.trim();
  const telephone = document.getElementById("inputTelephone").value.trim();
  const adresse = document.getElementById("inputAdresse").value.trim();

  // Validation
  if (!prenom) {
    showNotification("Le prénom est requis", "error");
    return;
  }

  if (!nom) {
    showNotification("Le nom est requis", "error");
    return;
  }

  if (!telephone) {
    showNotification("Le téléphone est requis", "error");
    return;
  }

  // Validation téléphone (format simple)
  if (!isValidPhone(telephone)) {
    showNotification("Numéro de téléphone invalide", "error");
    return;
  }

  try {
    let response;

    if (editingClientId) {
      // Modification
      response = await fetch(`${API_BASE}/clients/${editingClientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom,
          nom,
          telephone,
          adresse,
        }),
      });
    } else {
      // Création
      response = await fetch(`${API_BASE}/clients/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom,
          nom,
          telephone,
          adresse,
        }),
      });
    }

    if (!response.ok) throw new Error("Erreur sauvegarde");

    const result = await response.json();
    console.log("Client sauvegardé:", result);

    showNotification(
      editingClientId
        ? `✓ Client "${prenom} ${nom}" modifié`
        : `✓ Client "${prenom} ${nom}" ajouté`,
      "success",
    );

    closeModal();
    await loadClients();
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors de la sauvegarde", "error");
  }
}

/* ─────────────────────────────────────────────
   ÉDITER CLIENT
───────────────────────────────────────────── */

function editClient(clientId) {
  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    showNotification("Client non trouvé", "error");
    return;
  }

  editingClientId = clientId;
  document.getElementById("inputPrenom").value = client.prenom;
  document.getElementById("inputNom").value = client.nom;
  document.getElementById("inputTelephone").value = client.telephone;
  document.getElementById("inputAdresse").value = client.adresse || "";

  document.getElementById("modalTitle").textContent =
    `Éditer ${client.prenom} ${client.nom}`;
  openModal();
}

/* ─────────────────────────────────────────────
   SUPPRIMER CLIENT
───────────────────────────────────────────── */

async function deleteClient(clientId) {
  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    showNotification("Client non trouvé", "error");
    return;
  }

  // Confirmation
  if (
    !confirm(
      `Êtes-vous sûr de vouloir supprimer le client "${client.prenom} ${client.nom}"?\n\nCette action est irréversible.`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/clients/${clientId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Erreur suppression");

    const result = await response.json();
    console.log("Client supprimé:", result);

    showNotification(
      `✓ Client "${client.prenom} ${client.nom}" supprimé`,
      "success",
    );

    clients = clients.filter((c) => c.id !== clientId);
    displayClients(clients);
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors de la suppression", "error");
  }
}

/* ─────────────────────────────────────────────
   GESTION MODAL
───────────────────────────────────────────── */

function openModal() {
  document.getElementById("clientModal").classList.add("active");
  document.getElementById("inputPrenom").focus();
}

function closeModal() {
  document.getElementById("clientModal").classList.remove("active");
  resetForm();
}

function resetForm() {
  document.getElementById("inputPrenom").value = "";
  document.getElementById("inputNom").value = "";
  document.getElementById("inputTelephone").value = "";
  document.getElementById("inputAdresse").value = "";
  editingClientId = null;
}

/* ─────────────────────────────────────────────
   VALIDATIONS
───────────────────────────────────────────── */

function isValidPhone(phone) {
  // Accepte: 06 12 34 56 78, +33612345678, 0612345678, etc.
  const phoneRegex = /^(\+33|0)[1-9](?:[0-9]{8})$/;
  const cleaned = phone.replace(/[\s\-\.]/g, "");
  return phoneRegex.test(cleaned);
}

/* ─────────────────────────────────────────────
   UTILITAIRES
───────────────────────────────────────────── */

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Animation de sortie pour les notifications
const style = document.createElement("style");
style.textContent = `
  @keyframes slideOut {
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

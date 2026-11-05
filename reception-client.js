/* ═══════════════════════════════════════════════════════════
   LA MOUNA — Réception Commandes en Temps Réel
   WebSocket + API pour afficher les commandes
═══════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:3001/api";
let ws = null;
let commandes = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Réception Commandes démarrée");
  initializeReception();
  loadCommandesFromServer();
  connectWebSocket();
});

/* ─────────────────────────────────────────────
   INITIALISATION
───────────────────────────────────────────── */

function initializeReception() {
  // Créer la zone d'affichage des nouvelles commandes si elle n'existe pas
  const main = document.querySelector("main") || document.body;

  if (!document.getElementById("receptionDisplay")) {
    const receptionDiv = document.createElement("div");
    receptionDiv.id = "receptionDisplay";
    receptionDiv.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      max-width: 500px;
      max-height: 100vh;
      background: white;
      border-left: 3px solid var(--accent, #c41c3b);
      overflow-y: auto;
      z-index: 2000;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    `;
    document.body.appendChild(receptionDiv);
  }
}

/* ─────────────────────────────────────────────
   CHARGEMENT DES COMMANDES
───────────────────────────────────────────── */

async function loadCommandesFromServer() {
  try {
    const response = await fetch(`${API_BASE}/commandes`);
    if (!response.ok) throw new Error("Erreur chargement commandes");

    commandes = await response.json();
    console.log(`✓ ${commandes.length} commande(s) chargée(s)`);
    refreshDisplay();
  } catch (error) {
    console.error("Erreur chargement:", error);
    showError("Impossible de charger les commandes");
  }
}

/* ─────────────────────────────────────────────
   WEBSOCKET - TEMPS RÉEL
───────────────────────────────────────────── */

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//localhost:3001`);

  ws.onopen = () => {
    console.log("✓ WebSocket connecté");
    showNotification("Connecté au serveur", "success");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "nouvelle_commande") {
        handleNewCommand(data.commande);
      } else if (data.type === "mise_a_jour_commande") {
        handleCommandUpdate(data.commande);
      } else if (data.type === "init") {
        console.log("Init data received");
      }
    } catch (error) {
      console.error("Erreur parsing WebSocket:", error);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket erreur:", error);
    showNotification("Erreur de connexion", "error");
  };

  ws.onclose = () => {
    console.log("WebSocket fermée. Reconnexion dans 5s...");
    showNotification("Déconnecté du serveur", "warning");
    setTimeout(connectWebSocket, 5000);
  };
}

function handleNewCommand(commande) {
  console.log("Nouvelle commande:", commande);

  // Ajouter à la liste
  if (!commandes.find((c) => c.id === commande.id)) {
    commandes.unshift(commande);
  }

  // Afficher la notification
  playSound("notification");
  showNotification(
    `Nouvelle commande de ${commande.client.prenom} ${commande.client.nom}`,
    "success",
  );

  // Mettre à jour l'affichage
  refreshDisplay();
}

function handleCommandUpdate(commande) {
  console.log("Mise à jour commande:", commande);

  const index = commandes.findIndex((c) => c.id === commande.id);
  if (index > -1) {
    commandes[index] = commande;
    refreshDisplay();
  }
}

/* ─────────────────────────────────────────────
   AFFICHAGE
───────────────────────────────────────────── */

function refreshDisplay() {
  const display = document.getElementById("receptionDisplay");
  if (!display) return;

  if (commandes.length === 0) {
    display.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #999;">
        <p style="font-size: 3rem; margin: 0;">📭</p>
        <p>Aucune commande</p>
      </div>
    `;
    return;
  }

  // Créer le header
  let html = `
    <div style="padding: 1rem; background: var(--accent, #c41c3b); color: white; position: sticky; top: 0; z-index: 10;">
      <h2 style="margin: 0;">📱 Commandes en direct</h2>
      <p style="margin: 0.5rem 0 0; font-size: 0.9rem; opacity: 0.9;">${commandes.length} commande(s)</p>
    </div>
    <div style="padding: 1rem; overflow-y: auto; flex: 1;">
  `;

  // Ajouter chaque commande
  commandes.forEach((cmd) => {
    html += renderCommandeCard(cmd);
  });

  html += "</div>";
  display.innerHTML = html;

  // Attacher les événements
  attachCommandActions();
}

function renderCommandeCard(cmd) {
  const { client, items, service, paiement, montants, statut, date, heure } =
    cmd;
  const statusColors = {
    reçue: "#4CAF50",
    en_preparation: "#FF9800",
    prete: "#2196F3",
    livree: "#9C27B0",
  };

  const itemsList = items
    .map(
      (item) =>
        `<li>${item.quantity}x ${item.name} - ${(item.price * item.quantity).toFixed(2).replace(".", ",")} €</li>`,
    )
    .join("");

  return `
    <div style="
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.75rem;
      ">
        <div>
          <strong style="font-size: 1.1rem;">${client.prenom} ${client.nom}</strong>
          <p style="margin: 0.25rem 0; font-size: 0.9rem; color: #666;">
            📞 ${client.telephone}
          </p>
        </div>
        <select class="status-select" data-id="${cmd.id}" style="
          background: ${statusColors[statut]};
          color: white;
          border: none;
          padding: 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        ">
          <option value="reçue" ${statut === "reçue" ? "selected" : ""}>Reçue</option>
          <option value="en_preparation" ${statut === "en_preparation" ? "selected" : ""}>En prep.</option>
          <option value="prete" ${statut === "prete" ? "selected" : ""}>Prête</option>
          <option value="livree" ${statut === "livree" ? "selected" : ""}>Livrée</option>
        </select>
      </div>

      <div style="
        background: #f5f5f5;
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 0.75rem;
        font-size: 0.9rem;
      ">
        <ul style="margin: 0; padding-left: 1.5rem;">
          ${itemsList}
        </ul>
      </div>

      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
        color: #666;
      ">
        <div>
          <strong>Service:</strong> ${service === "livraison" ? "🚗 À livrer" : service === "emporter" ? "📦 À emporter" : "🏪 Sur place"}
        </div>
        <div>
          <strong>Paiement:</strong> ${paiement === "cash" ? "💶 Espèces" : "🏦 Virement"}
        </div>
        <div>
          <strong>Heure:</strong> ${heure}
        </div>
        <div>
          <strong>Date:</strong> ${new Date(date).toLocaleDateString("fr-FR")}
        </div>
      </div>

      ${
        client.adresse
          ? `
        <div style="
          background: #fff3e0;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
          border-left: 3px solid #FF9800;
        ">
          <strong>📍 Livraison:</strong> ${client.adresse}
        </div>
      `
          : ""
      }

      <div style="
        background: #f0f0f0;
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 0.75rem;
        text-align: right;
        font-weight: 600;
        font-size: 1.1rem;
      ">
        Total: <span style="color: var(--accent, #c41c3b);">${montants.total.toFixed(2).replace(".", ",")} €</span>
      </div>

      <div style="
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      ">
        <button class="btn-validate-cmd" data-id="${cmd.id}" style="
          flex: 1;
          padding: 0.5rem;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
        ">✓ Valider la commande</button>
      </div>

      <div style="
        display: flex;
        gap: 0.5rem;
      ">
        <button class="btn-edit-cmd" data-id="${cmd.id}" style="
          flex: 1;
          padding: 0.5rem;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        ">✏️ Éditer</button>
        <button class="btn-delete-cmd" data-id="${cmd.id}" style="
          flex: 1;
          padding: 0.5rem;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        ">🗑️ Supprimer</button>
      </div>
    </div>
  `;
}

function attachCommandActions() {
  // Changement de statut
  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.getAttribute("data-id");
      const newStatus = e.target.value;
      await updateCommandStatus(id, newStatus);
    });
  });

  // Bouton supprimer
  document.querySelectorAll(".btn-delete-cmd").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
        await deleteCommand(id);
      }
    });
  });

  // Bouton éditer
  document.querySelectorAll(".btn-edit-cmd").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      const cmd = commandes.find((c) => c.id === id);
      if (cmd) {
        alert(
          `Édition de la commande de ${cmd.client.prenom} ${cmd.client.nom}\nFonctionnalité en développement...`,
        );
      }
    });
  });

  // Bouton valider la commande (enregistrer le client)
  document.querySelectorAll(".btn-validate-cmd").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      const cmd = commandes.find((c) => c.id === id);
      if (cmd) {
        await validateAndSaveClient(cmd);
      }
    });
  });
}

/* ─────────────────────────────────────────────
   ACTIONS SERVEUR
───────────────────────────────────────────── */

async function updateCommandStatus(commandeId, newStatus) {
  try {
    const response = await fetch(`${API_BASE}/commandes/${commandeId}/statut`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatus }),
    });

    if (!response.ok) throw new Error("Erreur mise à jour statut");

    const result = await response.json();
    console.log("Statut mis à jour:", result);
    playSound("success");
    showNotification(`Statut mis à jour: ${newStatus}`, "success");
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur de mise à jour", "error");
  }
}

async function deleteCommand(commandeId) {
  try {
    const response = await fetch(`${API_BASE}/commandes/${commandeId}/delete`, {
      method: "POST",
    });

    if (!response.ok) throw new Error("Erreur suppression");

    const result = await response.json();
    console.log("Commande supprimée:", result);

    commandes = commandes.filter((c) => c.id !== commandeId);
    refreshDisplay();
    playSound("delete");
    showNotification("Commande supprimée", "success");
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur de suppression", "error");
  }
}

async function validateAndSaveClient(commande) {
  try {
    const { client } = commande;

    // Validation des données requises
    if (!client.prenom || !client.nom || !client.telephone) {
      showNotification(
        "Données client incomplètes (Prénom, Nom, Téléphone requis)",
        "error",
      );
      return;
    }

    // Sauvegarder le client
    const response = await fetch(`${API_BASE}/clients/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom: client.prenom,
        nom: client.nom,
        telephone: client.telephone,
        adresse: client.adresse || "",
      }),
    });

    if (!response.ok) throw new Error("Erreur sauvegarde client");

    const result = await response.json();
    console.log("Client enregistré:", result);

    playSound("success");
    showNotification(
      `✓ Client "${client.prenom} ${client.nom}" enregistré avec succès!`,
      "success",
    );
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors de l'enregistrement du client", "error");
  }
}

/* ─────────────────────────────────────────────
   UTILITAIRES
───────────────────────────────────────────── */

function showNotification(message, type = "info") {
  const notif = document.createElement("div");
  notif.style.cssText = `
    position: fixed;
    top: 1rem;
    left: 1rem;
    padding: 1rem 1.5rem;
    background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : type === "warning" ? "#FF9800" : "#2196F3"};
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2001;
    animation: slideIn 0.3s ease;
  `;
  notif.textContent = message;
  document.body.appendChild(notif);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(-400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => notif.remove(), 4000);
}

function playSound(type = "notification") {
  // Créer un son simple avec Web Audio API
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === "notification") {
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === "success") {
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2,
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === "delete") {
      oscillator.frequency.value = 400;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.15,
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  } catch (error) {
    console.log("Son non disponible");
  }
}

function showError(message) {
  const error = document.createElement("div");
  error.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 2rem;
    background: #f44336;
    color: white;
    border-radius: 8px;
    text-align: center;
    z-index: 2000;
  `;
  error.textContent = message;
  document.body.appendChild(error);
  setTimeout(() => error.remove(), 4000);
}

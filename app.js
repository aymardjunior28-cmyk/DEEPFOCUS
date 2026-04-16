const STORAGE_KEY = "trello-2-state-v1";

const labelPalette = [
  { id: "label-product", name: "Produit", color: "#0f766e" },
  { id: "label-design", name: "Design", color: "#8b5cf6" },
  { id: "label-urgent", name: "Urgent", color: "#dc2626" },
  { id: "label-marketing", name: "Marketing", color: "#ea580c" },
  { id: "label-tech", name: "Tech", color: "#2563eb" },
  { id: "label-research", name: "Recherche", color: "#16a34a" },
];

const boardCovers = [
  "linear-gradient(135deg, #ffd7ba, #f6b17a)",
  "linear-gradient(135deg, #c9f2e7, #7fd1bb)",
  "linear-gradient(135deg, #d9d1ff, #9381ff)",
  "linear-gradient(135deg, #fde68a, #f59e0b)",
  "linear-gradient(135deg, #fecdd3, #fb7185)",
  "linear-gradient(135deg, #bfdbfe, #60a5fa)",
];

const boardTextures = [
  "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0)), radial-gradient(circle at top right, rgba(255,255,255,0.28), transparent 30%)",
  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.32), transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0))",
  "linear-gradient(135deg, rgba(35,27,21,0.06), rgba(255,255,255,0)), radial-gradient(circle at bottom left, rgba(255,255,255,0.22), transparent 28%)",
];

let state = loadState();
let uiState = {
  activeBoardId: state.boards[0]?.id ?? null,
  search: "",
  labelFilter: "",
  memberFilter: "",
  dueSoonOnly: false,
  openModal: null,
};

const elements = {
  boardList: document.getElementById("board-list"),
  boardTitle: document.getElementById("board-title"),
  boardSummary: document.getElementById("board-summary"),
  boardCanvas: document.getElementById("board-canvas"),
  memberFilter: document.getElementById("member-filter"),
  labelFilter: document.getElementById("label-filter"),
  searchInput: document.getElementById("search-input"),
  workspaceMembers: document.getElementById("workspace-members"),
  modalRoot: document.getElementById("modal-root"),
};

wireGlobalEvents();
render();

function createDefaultState() {
  const members = [
    { id: createId("member"), name: "Awa", color: "#b84d1c" },
    { id: createId("member"), name: "Yanis", color: "#1e6f5c" },
    { id: createId("member"), name: "Lina", color: "#475569" },
  ];

  const labels = structuredClone(labelPalette);
  const today = new Date();
  const plusDays = (days) => {
    const value = new Date(today);
    value.setDate(today.getDate() + days);
    return value.toISOString().slice(0, 10);
  };

  return {
    members,
    labels,
    archivedCards: [],
    activity: [],
    boards: [
      {
        id: createId("board"),
        name: "Lancement Produit",
        description: "Pilotage du lancement avec backlog, production, QA et communication.",
        cover: boardCovers[0],
        texture: boardTextures[0],
        favorite: true,
        lists: [
          {
            id: createId("list"),
            name: "Backlog",
            cards: [
              {
                id: createId("card"),
                title: "Définir la roadmap publique",
                description: "Préparer le message produit, les jalons et la page de teasing.",
                dueDate: plusDays(3),
                labels: [labels[0].id, labels[3].id],
                members: [members[0].id],
                cover: boardCovers[4],
                checklist: [
                  { id: createId("check"), text: "Version courte", done: true },
                  { id: createId("check"), text: "Version détaillée", done: false },
                ],
                comments: [
                  {
                    id: createId("comment"),
                    authorId: members[1].id,
                    text: "Aligner avec les annonces marketing cette semaine.",
                    createdAt: new Date().toISOString(),
                  },
                ],
                attachments: [
                  {
                    id: createId("file"),
                    name: "brief-lancement.pdf",
                    type: "Lien simulé",
                  },
                ],
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: createId("list"),
            name: "En cours",
            cards: [
              {
                id: createId("card"),
                title: "Refonte du parcours d'onboarding",
                description: "Revoir la première expérience des nouveaux utilisateurs.",
                dueDate: plusDays(1),
                labels: [labels[1].id, labels[4].id],
                members: [members[1].id, members[2].id],
                cover: boardCovers[2],
                checklist: [
                  { id: createId("check"), text: "Maquettes", done: true },
                  { id: createId("check"), text: "Contenu", done: true },
                  { id: createId("check"), text: "Implémentation", done: false },
                ],
                comments: [],
                attachments: [],
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: createId("list"),
            name: "Terminé",
            cards: [
              {
                id: createId("card"),
                title: "Checklist QA de pré-lancement",
                description: "Document de validation pour la release candidate.",
                dueDate: plusDays(-1),
                labels: [labels[2].id, labels[4].id],
                members: [members[2].id],
                cover: boardCovers[1],
                checklist: [
                  { id: createId("check"), text: "Parcours critique", done: true },
                  { id: createId("check"), text: "Responsive", done: true },
                ],
                comments: [],
                attachments: [],
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultState();
      persistState(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.boards?.length) {
      const fresh = createDefaultState();
      persistState(fresh);
      return fresh;
    }
    return parsed;
  } catch {
    const fresh = createDefaultState();
    persistState(fresh);
    return fresh;
  }
}

function saveState(nextState = state) {
  state = nextState;
  persistState(state);
}

function persistState(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function wireGlobalEvents() {
  document.getElementById("new-board-btn").addEventListener("click", openBoardModal);
  document.getElementById("add-list-btn").addEventListener("click", openListModal);
  document.getElementById("add-member-btn").addEventListener("click", openMemberModal);
  document.getElementById("board-settings-btn").addEventListener("click", openBoardSettingsModal);
  document.getElementById("show-archive-btn").addEventListener("click", openArchiveModal);
  document.getElementById("clear-filters-btn").addEventListener("click", () => {
    uiState.search = "";
    uiState.labelFilter = "";
    uiState.memberFilter = "";
    uiState.dueSoonOnly = false;
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    uiState.search = event.target.value.trim().toLowerCase();
    renderBoardCanvas();
  });

  elements.memberFilter.addEventListener("change", (event) => {
    uiState.memberFilter = event.target.value;
    renderBoardCanvas();
  });

  elements.labelFilter.addEventListener("change", (event) => {
    uiState.labelFilter = event.target.value;
    renderBoardCanvas();
  });

  document.getElementById("due-only-filter").addEventListener("change", (event) => {
    uiState.dueSoonOnly = event.target.checked;
    renderBoardCanvas();
  });
}

function render() {
  if (!getActiveBoard()) {
    uiState.activeBoardId = state.boards[0]?.id ?? null;
  }

  elements.searchInput.value = uiState.search;
  elements.memberFilter.value = uiState.memberFilter;
  elements.labelFilter.value = uiState.labelFilter;
  document.getElementById("due-only-filter").checked = uiState.dueSoonOnly;

  renderBoards();
  renderWorkspaceMembers();
  renderFilters();
  renderBoardHeader();
  renderBoardSummary();
  renderBoardCanvas();
  renderModal();
}

function renderBoards() {
  elements.boardList.innerHTML = "";
  state.boards.forEach((board) => {
    const button = document.createElement("button");
    button.className = `board-item ${board.id === uiState.activeBoardId ? "active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(board.name)}</strong>
      <div class="muted">${escapeHtml(board.description || "Sans description")}</div>
    `;
    button.addEventListener("click", () => {
      uiState.activeBoardId = board.id;
      render();
    });
    elements.boardList.append(button);
  });
}

function renderWorkspaceMembers() {
  elements.workspaceMembers.innerHTML = "";
  state.members.forEach((member) => {
    const item = document.createElement("div");
    item.className = "member-pill";
    item.innerHTML = `
      <span class="avatar" style="background:${member.color}">${initials(member.name)}</span>
      <span>${escapeHtml(member.name)}</span>
    `;
    elements.workspaceMembers.append(item);
  });
}

function renderFilters() {
  syncSelectOptions(elements.memberFilter, state.members, "name");
  syncSelectOptions(elements.labelFilter, state.labels, "name");
  elements.memberFilter.value = uiState.memberFilter;
  elements.labelFilter.value = uiState.labelFilter;
}

function syncSelectOptions(select, entries, labelKey) {
  const current = select.value;
  select.innerHTML = `<option value="">Tous</option>`;
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry[labelKey];
    select.append(option);
  });
  select.value = current;
}

function renderBoardHeader() {
  const board = getActiveBoard();
  elements.boardTitle.textContent = board?.name ?? "Aucun board";
}

function renderBoardSummary() {
  const board = getActiveBoard();
  if (!board) {
    elements.boardSummary.innerHTML = '<div class="empty-state">Aucun board disponible.</div>';
    return;
  }

  const cards = board.lists.flatMap((list) => list.cards);
  const dueSoonCount = cards.filter((card) => isDueSoon(card.dueDate)).length;
  const completedChecklistCount = cards.reduce(
    (total, card) => total + card.checklist.filter((item) => item.done).length,
    0
  );

  elements.boardSummary.style.setProperty(
    "--board-cover",
    `${board.texture || boardTextures[0]}, ${board.cover || boardCovers[0]}`
  );

  elements.boardSummary.innerHTML = `
    <div class="summary-grid">
      <div>
        <p class="eyebrow">Vue d'ensemble</p>
        <h3>${escapeHtml(board.name)}</h3>
        <p class="muted">${escapeHtml(board.description || "Pas encore de description.")}</p>
      </div>
      <div class="summary-tile">
        <span class="eyebrow">Listes</span>
        <strong>${board.lists.length}</strong>
      </div>
      <div class="summary-tile">
        <span class="eyebrow">Cartes</span>
        <strong>${cards.length}</strong>
      </div>
      <div class="summary-tile">
        <span class="eyebrow">Urgent</span>
        <strong>${dueSoonCount}</strong>
      </div>
      <div class="summary-tile">
        <span class="eyebrow">Checklist</span>
        <strong>${completedChecklistCount}</strong>
      </div>
    </div>
  `;
}

function renderBoardCanvas() {
  const board = getActiveBoard();
  elements.boardCanvas.innerHTML = "";

  if (!board) {
    elements.boardCanvas.innerHTML = '<div class="empty-state">Crée un board pour commencer.</div>';
    return;
  }

  board.lists.forEach((list) => {
    const listNode = document.createElement("article");
    listNode.className = "list-column";
    listNode.dataset.listId = list.id;
    listNode.innerHTML = `
      <div class="list-header">
        <h3>${escapeHtml(list.name)}</h3>
        <div class="card-actions">
          <button class="tiny-btn" data-action="rename-list">Renommer</button>
          <button class="tiny-btn" data-action="delete-list">Supprimer</button>
        </div>
      </div>
      <div class="card-list"></div>
      <form class="add-card-form">
        <label class="stacked-field">
          <span class="sr-only">Titre de la carte</span>
          <input name="title" type="text" placeholder="Ajouter une carte..." required />
        </label>
        <div class="form-actions">
          <button class="primary-btn" type="submit">Ajouter</button>
        </div>
      </form>
    `;

    const cardList = listNode.querySelector(".card-list");
    cardList.dataset.listId = list.id;
    enableListDropZone(cardList, list.id);

    const visibleCards = list.cards.filter(matchesFilters);
    if (!visibleCards.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = list.cards.length ? "Aucune carte ne correspond aux filtres." : "Liste vide.";
      cardList.append(empty);
    } else {
      visibleCards.forEach((card) => cardList.append(renderCard(card, list.id)));
    }

    listNode.querySelector(".add-card-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = String(form.get("title") || "").trim();
      if (!title) return;
      mutateBoard((activeBoard) => {
        const targetList = activeBoard.lists.find((item) => item.id === list.id);
        targetList.cards.push(createCard({ title }));
        addActivity(`Carte "${title}" créée dans ${targetList.name}`);
      });
      render();
    });

    listNode.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      if (action === "rename-list") {
        openListModal(list.id);
      }
      if (action === "delete-list") {
        mutateBoard((activeBoard) => {
          activeBoard.lists = activeBoard.lists.filter((item) => item.id !== list.id);
          addActivity(`Liste "${list.name}" supprimée`);
        });
        render();
      }
    });

    elements.boardCanvas.append(listNode);
  });
}

function renderCard(card, listId) {
  const cardNode = document.createElement("button");
  const dueClass = card.dueDate ? getDueClass(card.dueDate) : "";
  cardNode.className = "card";
  cardNode.draggable = true;
  cardNode.dataset.cardId = card.id;
  cardNode.dataset.listId = listId;

  const checklistDone = card.checklist.filter((item) => item.done).length;
  const labelsMarkup = card.labels
    .map((labelId) => state.labels.find((label) => label.id === labelId))
    .filter(Boolean)
    .map(
      (label) =>
        `<span class="label-chip" style="background:${label.color}">${escapeHtml(label.name)}</span>`
    )
    .join("");

  const membersMarkup = card.members
    .map((memberId) => state.members.find((member) => member.id === memberId))
    .filter(Boolean)
    .map(
      (member) =>
        `<span class="avatar" style="background:${member.color}" title="${escapeHtml(member.name)}">${initials(member.name)}</span>`
    )
    .join("");

  cardNode.innerHTML = `
    ${card.cover ? `<div class="cover-bar" style="background:${card.cover}"></div>` : ""}
    ${labelsMarkup ? `<div class="labels-row">${labelsMarkup}</div>` : ""}
    <div class="card-topline">
      <h4 class="card-title">${escapeHtml(card.title)}</h4>
      <span class="muted">${card.comments.length}</span>
    </div>
    ${card.description ? `<p class="card-description">${escapeHtml(card.description)}</p>` : ""}
    <div class="card-meta">
      <div class="meta-row">
        ${card.dueDate ? `<span class="badge ${dueClass}">Échéance ${formatDate(card.dueDate)}</span>` : ""}
        ${card.checklist.length ? `<span class="badge">${checklistDone}/${card.checklist.length} checklist</span>` : ""}
        ${card.attachments.length ? `<span class="badge">${card.attachments.length} pièce(s)</span>` : ""}
      </div>
      <div class="meta-row">${membersMarkup}</div>
    </div>
  `;

  cardNode.addEventListener("click", () => {
    uiState.openModal = { type: "card", cardId: card.id };
    renderModal();
  });

  cardNode.addEventListener("dragstart", (event) => {
    cardNode.classList.add("dragging");
    event.dataTransfer.setData("text/plain", JSON.stringify({ cardId: card.id, fromListId: listId }));
  });

  cardNode.addEventListener("dragend", () => {
    cardNode.classList.remove("dragging");
    document.querySelectorAll(".drag-target").forEach((node) => node.classList.remove("drag-target"));
  });

  return cardNode;
}

function enableListDropZone(node, targetListId) {
  node.addEventListener("dragover", (event) => {
    event.preventDefault();
    node.classList.add("drag-target");
  });

  node.addEventListener("dragleave", () => {
    node.classList.remove("drag-target");
  });

  node.addEventListener("drop", (event) => {
    event.preventDefault();
    node.classList.remove("drag-target");
    const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
    moveCard(payload.fromListId, targetListId, payload.cardId);
  });
}

function renderModal() {
  elements.modalRoot.innerHTML = "";
  if (!uiState.openModal) return;

  const template = document.getElementById("modal-template");
  const fragment = template.content.cloneNode(true);
  const backdrop = fragment.querySelector(".modal-backdrop");
  const content = fragment.querySelector(".modal-content");
  const closeButton = fragment.querySelector(".close-modal");

  closeButton.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });

  if (uiState.openModal.type === "board") content.append(buildBoardForm());
  if (uiState.openModal.type === "list") content.append(buildListForm(uiState.openModal.listId));
  if (uiState.openModal.type === "member") content.append(buildMemberForm());
  if (uiState.openModal.type === "board-settings") content.append(buildBoardSettings());
  if (uiState.openModal.type === "archive") content.append(buildArchiveView());
  if (uiState.openModal.type === "card") content.append(buildCardDetails(uiState.openModal.cardId));

  elements.modalRoot.append(fragment);
}

function buildBoardForm() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2>Nouveau board</h2>
    <form class="form-grid">
      <label>
        <span>Nom</span>
        <input name="name" type="text" required placeholder="Ex: Sprint mobile" />
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" placeholder="Objectif du board"></textarea>
      </label>
      <div class="detail-card">
        <div class="modal-section-header">
          <strong>Cover</strong>
        </div>
        <div class="pill-grid">
          ${boardCovers
            .map(
              (cover, index) => `
              <button class="cover-option ${index === 0 ? "selected" : ""}" type="button" data-cover="${cover}" style="background:${cover}"></button>
            `
            )
            .join("")}
        </div>
      </div>
      <div class="form-actions">
        <button class="primary-btn" type="submit">Créer</button>
      </div>
    </form>
  `;

  let selectedCover = boardCovers[0];
  wrapper.querySelectorAll(".cover-option").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCover = button.dataset.cover;
      wrapper.querySelectorAll(".cover-option").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  wrapper.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const board = {
      id: createId("board"),
      name: String(data.get("name")).trim(),
      description: String(data.get("description")).trim(),
      cover: selectedCover,
      texture: boardTextures[Math.floor(Math.random() * boardTextures.length)],
      favorite: false,
      lists: [
        { id: createId("list"), name: "À faire", cards: [] },
        { id: createId("list"), name: "En cours", cards: [] },
        { id: createId("list"), name: "Fait", cards: [] },
      ],
    };

    state.boards.push(board);
    uiState.activeBoardId = board.id;
    addActivity(`Board "${board.name}" créé`);
    saveState();
    closeModal();
    render();
  });

  return wrapper;
}

function buildListForm(listId) {
  const board = getActiveBoard();
  const list = board?.lists.find((entry) => entry.id === listId);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2>${list ? "Modifier la liste" : "Nouvelle liste"}</h2>
    <form class="form-grid">
      <label>
        <span>Nom</span>
        <input name="name" type="text" required value="${escapeAttribute(list?.name || "")}" />
      </label>
      <div class="form-actions">
        <button class="primary-btn" type="submit">${list ? "Enregistrer" : "Créer"}</button>
      </div>
    </form>
  `;

  wrapper.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (!name) return;
    mutateBoard((activeBoard) => {
      if (list) {
        list.name = name;
        addActivity(`Liste renommée en "${name}"`);
      } else {
        activeBoard.lists.push({ id: createId("list"), name, cards: [] });
        addActivity(`Liste "${name}" ajoutée`);
      }
    });
    closeModal();
    render();
  });

  return wrapper;
}

function buildMemberForm() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2>Nouveau membre</h2>
    <form class="form-grid">
      <label>
        <span>Nom</span>
        <input name="name" type="text" required placeholder="Ex: Mariam" />
      </label>
      <label>
        <span>Couleur</span>
        <input name="color" type="color" value="#1e6f5c" />
      </label>
      <div class="form-actions">
        <button class="primary-btn" type="submit">Ajouter</button>
      </div>
    </form>
  `;

  wrapper.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.members.push({
      id: createId("member"),
      name: String(data.get("name")).trim(),
      color: String(data.get("color")),
    });
    addActivity(`Membre "${String(data.get("name")).trim()}" ajouté au workspace`);
    saveState();
    closeModal();
    render();
  });

  return wrapper;
}

function buildBoardSettings() {
  const board = getActiveBoard();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2>Personnaliser le board</h2>
    <div class="detail-grid">
      <div class="detail-column">
        <div class="detail-card">
          <form class="form-grid" id="board-settings-form">
            <label>
              <span>Nom</span>
              <input name="name" type="text" required value="${escapeAttribute(board.name)}" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="description">${escapeHtml(board.description || "")}</textarea>
            </label>
            <div class="form-actions">
              <button class="primary-btn" type="submit">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
      <div class="side-panel">
        <div class="side-card">
          <div class="modal-section-header">
            <strong>Cover</strong>
          </div>
          <div class="pill-grid">
            ${boardCovers
              .map(
                (cover) => `
                <button class="cover-option ${cover === board.cover ? "selected" : ""}" type="button" data-cover="${cover}" style="background:${cover}"></button>
              `
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.querySelectorAll(".cover-option").forEach((button) => {
    button.addEventListener("click", () => {
      mutateBoard((activeBoard) => {
        activeBoard.cover = button.dataset.cover;
      });
      renderModal();
      renderBoardSummary();
    });
  });

  wrapper.querySelector("#board-settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutateBoard((activeBoard) => {
      activeBoard.name = String(data.get("name")).trim();
      activeBoard.description = String(data.get("description")).trim();
      addActivity(`Board "${activeBoard.name}" mis à jour`);
    });
    closeModal();
    render();
  });

  return wrapper;
}

function buildArchiveView() {
  const wrapper = document.createElement("div");
  const archived = state.archivedCards;
  wrapper.innerHTML = `
    <h2>Cartes archivées</h2>
    <div class="archive-list">
      ${
        archived.length
          ? archived
              .map(
                (item) => `
                <div class="archive-item">
                  <strong>${escapeHtml(item.card.title)}</strong>
                  <p class="muted">${escapeHtml(item.boardName)} / ${escapeHtml(item.listName)}</p>
                  <button class="secondary-btn" type="button" data-restore="${item.card.id}">Restaurer</button>
                </div>
              `
              )
              .join("")
          : '<div class="empty-state">Aucune carte archivée.</div>'
      }
    </div>
  `;

  wrapper.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => {
      const archiveItem = state.archivedCards.find((entry) => entry.card.id === button.dataset.restore);
      if (!archiveItem) return;
      const board = state.boards.find((entry) => entry.id === archiveItem.boardId);
      const list = board?.lists.find((entry) => entry.id === archiveItem.listId);
      if (list) {
        list.cards.push(archiveItem.card);
        state.archivedCards = state.archivedCards.filter((entry) => entry.card.id !== archiveItem.card.id);
        addActivity(`Carte "${archiveItem.card.title}" restaurée`);
        saveState();
        render();
      }
    });
  });

  return wrapper;
}

function buildCardDetails(cardId) {
  const found = findCard(cardId);
  const { card, list, board } = found ?? {};
  const wrapper = document.createElement("div");
  if (!card) {
    wrapper.innerHTML = '<div class="empty-state">Carte introuvable.</div>';
    return wrapper;
  }

  const checklistDone = card.checklist.filter((item) => item.done).length;
  const checklistPercent = card.checklist.length ? Math.round((checklistDone / card.checklist.length) * 100) : 0;

  wrapper.innerHTML = `
    <h2>${escapeHtml(card.title)}</h2>
    <p class="muted">${escapeHtml(board.name)} / ${escapeHtml(list.name)}</p>
    <div class="detail-grid">
      <div class="detail-column">
        <section class="detail-card">
          <div class="modal-section-header">
            <strong>Détails</strong>
          </div>
          <form id="card-detail-form" class="form-grid">
            <label>
              <span>Titre</span>
              <input name="title" type="text" value="${escapeAttribute(card.title)}" required />
            </label>
            <label>
              <span>Description</span>
              <textarea name="description">${escapeHtml(card.description || "")}</textarea>
            </label>
            <label>
              <span>Date d'échéance</span>
              <input name="dueDate" type="date" value="${escapeAttribute(card.dueDate || "")}" />
            </label>
            <label>
              <span>Pièce jointe simulée</span>
              <input name="attachmentName" type="text" placeholder="Ex: maquette.fig" />
            </label>
            <div class="form-actions">
              <button class="primary-btn" type="submit">Enregistrer</button>
              <button class="secondary-btn" type="button" id="archive-card-btn">Archiver</button>
              <button class="secondary-btn" type="button" id="delete-card-btn">Supprimer</button>
            </div>
          </form>
        </section>

        <section class="detail-card">
          <div class="modal-section-header">
            <strong>Checklist</strong>
            <span>${checklistDone}/${card.checklist.length}</span>
          </div>
          <div class="progress-bar"><span style="width:${checklistPercent}%"></span></div>
          <div class="checklist-items" id="checklist-items">
            ${
              card.checklist.length
                ? card.checklist
                    .map(
                      (item) => `
                      <label class="checklist-item inline-check">
                        <input type="checkbox" data-check-id="${item.id}" ${item.done ? "checked" : ""} />
                        <span>${escapeHtml(item.text)}</span>
                        <button type="button" class="tiny-btn" data-remove-check="${item.id}">Supprimer</button>
                      </label>
                    `
                    )
                    .join("")
                : '<div class="empty-state">Aucune checklist pour cette carte.</div>'
            }
          </div>
          <form id="checklist-form" class="form-grid">
            <label>
              <span>Nouvel item</span>
              <input name="text" type="text" required placeholder="Ex: Préparer le test utilisateur" />
            </label>
            <button class="secondary-btn" type="submit">Ajouter à la checklist</button>
          </form>
        </section>

        <section class="detail-card">
          <div class="modal-section-header">
            <strong>Commentaires</strong>
            <span>${card.comments.length}</span>
          </div>
          <div class="comment-list">
            ${
              card.comments.length
                ? card.comments
                    .map((comment) => {
                      const author = state.members.find((member) => member.id === comment.authorId);
                      return `
                        <div class="comment-item">
                          <strong>${escapeHtml(author?.name || "Inconnu")}</strong>
                          <p>${escapeHtml(comment.text)}</p>
                          <small class="muted">${formatDateTime(comment.createdAt)}</small>
                        </div>
                      `;
                    })
                    .join("")
                : '<div class="empty-state">Pas encore de commentaires.</div>'
            }
          </div>
          <form id="comment-form" class="comment-form">
            <label>
              <span>Commentaire</span>
              <textarea name="text" required placeholder="Laisser une note pour l'équipe"></textarea>
            </label>
            <label>
              <span>Auteur</span>
              <select name="authorId">
                ${state.members
                  .map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`)
                  .join("")}
              </select>
            </label>
            <button class="secondary-btn" type="submit">Ajouter un commentaire</button>
          </form>
        </section>
      </div>

      <aside class="side-panel">
        <section class="side-card">
          <div class="modal-section-header">
            <strong>Labels</strong>
          </div>
          <div class="pill-grid" id="label-selector">
            ${state.labels
              .map(
                (label) => `
                <button class="label-chip" type="button" data-label-id="${label.id}" style="background:${label.color}; opacity:${card.labels.includes(label.id) ? "1" : "0.42"}">
                  ${escapeHtml(label.name)}
                </button>
              `
              )
              .join("")}
          </div>
        </section>

        <section class="side-card">
          <div class="modal-section-header">
            <strong>Membres</strong>
          </div>
          <div class="pill-grid" id="member-selector">
            ${state.members
              .map(
                (member) => `
                <button class="member-pill" type="button" data-member-id="${member.id}" style="opacity:${card.members.includes(member.id) ? "1" : "0.42"}">
                  <span class="avatar" style="background:${member.color}">${initials(member.name)}</span>
                  <span>${escapeHtml(member.name)}</span>
                </button>
              `
              )
              .join("")}
          </div>
        </section>

        <section class="side-card">
          <div class="modal-section-header">
            <strong>Cover</strong>
          </div>
          <div class="pill-grid" id="cover-selector">
            ${boardCovers
              .map(
                (cover) => `
                <button class="cover-option ${cover === card.cover ? "selected" : ""}" type="button" data-card-cover="${cover}" style="background:${cover}"></button>
              `
              )
              .join("")}
          </div>
        </section>

        <section class="side-card">
          <div class="modal-section-header">
            <strong>Pièces jointes</strong>
          </div>
          <div class="archive-list">
            ${
              card.attachments.length
                ? card.attachments
                    .map(
                      (item) => `
                      <div class="archive-item">
                        <strong>${escapeHtml(item.name)}</strong>
                        <p class="muted">${escapeHtml(item.type)}</p>
                      </div>
                    `
                    )
                    .join("")
                : '<div class="empty-state">Aucune pièce jointe.</div>'
            }
          </div>
        </section>

        <section class="side-card">
          <div class="modal-section-header">
            <strong>Activité récente</strong>
          </div>
          <div class="activity-list">
            ${state.activity
              .slice(0, 6)
              .map(
                (entry) => `
                <div class="activity-item">
                  <p>${escapeHtml(entry.text)}</p>
                  <small class="muted">${formatDateTime(entry.createdAt)}</small>
                </div>
              `
              )
              .join("")}
          </div>
        </section>
      </aside>
    </div>
  `;

  wrapper.querySelector("#card-detail-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const attachmentName = String(data.get("attachmentName")).trim();
    updateCard(card.id, (targetCard) => {
      targetCard.title = String(data.get("title")).trim();
      targetCard.description = String(data.get("description")).trim();
      targetCard.dueDate = String(data.get("dueDate")).trim();
      if (attachmentName) {
        targetCard.attachments.push({
          id: createId("file"),
          name: attachmentName,
          type: "Pièce jointe simulée",
        });
      }
    });
    addActivity(`Carte "${String(data.get("title")).trim()}" mise à jour`);
    render();
  });

  wrapper.querySelector("#archive-card-btn").addEventListener("click", () => {
    archiveCard(card.id);
    closeModal();
    render();
  });

  wrapper.querySelector("#delete-card-btn").addEventListener("click", () => {
    deleteCard(card.id);
    closeModal();
    render();
  });

  wrapper.querySelector("#checklist-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = String(data.get("text")).trim();
    if (!text) return;
    updateCard(card.id, (targetCard) => {
      targetCard.checklist.push({ id: createId("check"), text, done: false });
    });
    addActivity(`Checklist ajoutée à "${card.title}"`);
    renderModal();
  });

  wrapper.querySelectorAll("[data-check-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      updateCard(card.id, (targetCard) => {
        const item = targetCard.checklist.find((entry) => entry.id === checkbox.dataset.checkId);
        if (item) item.done = checkbox.checked;
      });
      renderModal();
      renderBoardCanvas();
    });
  });

  wrapper.querySelectorAll("[data-remove-check]").forEach((button) => {
    button.addEventListener("click", () => {
      updateCard(card.id, (targetCard) => {
        targetCard.checklist = targetCard.checklist.filter((item) => item.id !== button.dataset.removeCheck);
      });
      renderModal();
      renderBoardCanvas();
    });
  });

  wrapper.querySelector("#comment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateCard(card.id, (targetCard) => {
      targetCard.comments.unshift({
        id: createId("comment"),
        authorId: String(data.get("authorId")),
        text: String(data.get("text")).trim(),
        createdAt: new Date().toISOString(),
      });
    });
    addActivity(`Commentaire ajouté sur "${card.title}"`);
    renderModal();
    renderBoardCanvas();
  });

  wrapper.querySelectorAll("[data-label-id]").forEach((button) => {
    button.addEventListener("click", () => {
      updateCard(card.id, (targetCard) => {
        toggleInArray(targetCard.labels, button.dataset.labelId);
      });
      renderModal();
      renderBoardCanvas();
    });
  });

  wrapper.querySelectorAll("[data-member-id]").forEach((button) => {
    button.addEventListener("click", () => {
      updateCard(card.id, (targetCard) => {
        toggleInArray(targetCard.members, button.dataset.memberId);
      });
      renderModal();
      renderBoardCanvas();
    });
  });

  wrapper.querySelectorAll("[data-card-cover]").forEach((button) => {
    button.addEventListener("click", () => {
      updateCard(card.id, (targetCard) => {
        targetCard.cover = button.dataset.cardCover;
      });
      renderModal();
      renderBoardCanvas();
    });
  });

  return wrapper;
}

function openBoardModal() {
  uiState.openModal = { type: "board" };
  renderModal();
}

function openListModal(listId = null) {
  uiState.openModal = { type: "list", listId };
  renderModal();
}

function openMemberModal() {
  uiState.openModal = { type: "member" };
  renderModal();
}

function openBoardSettingsModal() {
  uiState.openModal = { type: "board-settings" };
  renderModal();
}

function openArchiveModal() {
  uiState.openModal = { type: "archive" };
  renderModal();
}

function closeModal() {
  uiState.openModal = null;
  renderModal();
}

function createCard({ title }) {
  return {
    id: createId("card"),
    title,
    description: "",
    dueDate: "",
    labels: [],
    members: [],
    cover: "",
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: new Date().toISOString(),
  };
}

function getActiveBoard() {
  return state.boards.find((board) => board.id === uiState.activeBoardId);
}

function mutateBoard(mutator) {
  const board = getActiveBoard();
  if (!board) return;
  mutator(board);
  saveState();
}

function updateCard(cardId, mutator) {
  const found = findCard(cardId);
  if (!found) return;
  mutator(found.card, found.list, found.board);
  saveState();
}

function findCard(cardId) {
  for (const board of state.boards) {
    for (const list of board.lists) {
      const card = list.cards.find((entry) => entry.id === cardId);
      if (card) return { board, list, card };
    }
  }
  return null;
}

function deleteCard(cardId) {
  const found = findCard(cardId);
  if (!found) return;
  found.list.cards = found.list.cards.filter((card) => card.id !== cardId);
  addActivity(`Carte "${found.card.title}" supprimée`);
  saveState();
}

function archiveCard(cardId) {
  const found = findCard(cardId);
  if (!found) return;
  found.list.cards = found.list.cards.filter((card) => card.id !== cardId);
  state.archivedCards.unshift({
    boardId: found.board.id,
    boardName: found.board.name,
    listId: found.list.id,
    listName: found.list.name,
    card: found.card,
  });
  addActivity(`Carte "${found.card.title}" archivée`);
  saveState();
}

function moveCard(fromListId, toListId, cardId) {
  if (fromListId === toListId) return;
  mutateBoard((board) => {
    const fromList = board.lists.find((list) => list.id === fromListId);
    const toList = board.lists.find((list) => list.id === toListId);
    if (!fromList || !toList) return;
    const index = fromList.cards.findIndex((card) => card.id === cardId);
    if (index === -1) return;
    const [card] = fromList.cards.splice(index, 1);
    toList.cards.push(card);
    addActivity(`Carte "${card.title}" déplacée de ${fromList.name} vers ${toList.name}`);
  });
  render();
}

function addActivity(text) {
  state.activity.unshift({ id: createId("activity"), text, createdAt: new Date().toISOString() });
  state.activity = state.activity.slice(0, 50);
}

function matchesFilters(card) {
  if (uiState.search) {
    const haystack = `${card.title} ${card.description}`.toLowerCase();
    if (!haystack.includes(uiState.search)) return false;
  }
  if (uiState.labelFilter && !card.labels.includes(uiState.labelFilter)) return false;
  if (uiState.memberFilter && !card.members.includes(uiState.memberFilter)) return false;
  if (uiState.dueSoonOnly && !isDueSoon(card.dueDate)) return false;
  return true;
}

function isDueSoon(dateText) {
  if (!dateText) return false;
  const today = new Date();
  const target = new Date(`${dateText}T23:59:59`);
  const diffDays = Math.ceil((target - today) / 86400000);
  return diffDays <= 3;
}

function getDueClass(dateText) {
  if (!dateText) return "";
  const today = new Date();
  const target = new Date(`${dateText}T23:59:59`);
  if (target < today) return "danger";
  if (isDueSoon(dateText)) return "warning";
  return "";
}

function toggleInArray(array, value) {
  const index = array.indexOf(value);
  if (index >= 0) array.splice(index, 1);
  else array.push(value);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function initials(name) {
  return name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateText) {
  return new Date(`${dateText}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(dateText) {
  return new Date(dateText).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

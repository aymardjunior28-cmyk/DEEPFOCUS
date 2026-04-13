import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const covers = {
  sunset: "linear-gradient(135deg, #f97316 0%, #fb7185 100%)",
  ocean: "linear-gradient(135deg, #0891b2 0%, #2563eb 100%)",
  forest: "linear-gradient(135deg, #15803d 0%, #0f766e 100%)",
  gold: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
  violet: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
  slate: "linear-gradient(135deg, #334155 0%, #0f172a 100%)"
};

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="text-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CardModal({ data, workspace, onClose, onUpdateCard }) {
  const { card } = data;
  const [uploadState, setUploadState] = useState("");
  const fileInputId = `file-${card.id}`;

  return (
    <Modal title={card.title} onClose={onClose}>
      <div className="card-modal-grid">
        <div className="modal-form">
          <label>
            <span>Titre</span>
            <input
              value={card.title}
              onChange={(event) =>
                onUpdateCard(card.id, (draftCard) => {
                  draftCard.title = event.target.value;
                })
              }
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={card.description}
              onChange={(event) =>
                onUpdateCard(card.id, (draftCard) => {
                  draftCard.description = event.target.value;
                })
              }
            />
          </label>
          <label>
            <span>Échéance</span>
            <input
              type="date"
              value={card.dueDate}
              onChange={(event) =>
                onUpdateCard(card.id, (draftCard) => {
                  draftCard.dueDate = event.target.value;
                })
              }
            />
          </label>
          <label>
            <span>Checklist</span>
            <div className="checklist-box">
              {card.checklist.map((item) => (
                <label key={item.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) =>
                      onUpdateCard(card.id, (draftCard) => {
                        const target = draftCard.checklist.find((entry) => entry.id === item.id);
                        target.done = event.target.checked;
                      })
                    }
                  />
                  <span>{item.text}</span>
                </label>
              ))}
              <button
                className="secondary-btn"
                type="button"
                onClick={() =>
                  onUpdateCard(card.id, (draftCard) => {
                    draftCard.checklist.push({
                      id: crypto.randomUUID(),
                      text: `Nouvelle tâche ${draftCard.checklist.length + 1}`,
                      done: false
                    });
                  })
                }
              >
                Ajouter un item
              </button>
            </div>
          </label>
          <label>
            <span>Commentaires</span>
            <div className="comment-box">
              {card.comments.map((item) => (
                <div key={item.id} className="comment-item">
                  <strong>{item.author}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
              <button
                className="secondary-btn"
                type="button"
                onClick={() =>
                  onUpdateCard(card.id, (draftCard) => {
                    draftCard.comments.unshift({
                      id: crypto.randomUUID(),
                      author: "Toi",
                      text: "Nouveau commentaire",
                      createdAt: new Date().toISOString()
                    });
                  })
                }
              >
                Ajouter un commentaire
              </button>
            </div>
          </label>
          <label>
            <span>Pieces jointes</span>
            <div className="comment-box">
              {card.attachments.map((file) => (
                <a key={file.id} className="attachment-link" href={file.url} target="_blank" rel="noreferrer">
                  <strong>{file.name}</strong>
                  <small>{file.mimeType || "fichier"}</small>
                </a>
              ))}
              <input
                id={fileInputId}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploadState("uploading");
                  api
                    .uploadAttachment(card.id, file)
                    .then(() => {
                      setUploadState("done");
                      event.target.value = "";
                    })
                    .catch((error) => setUploadState(error.message));
                }}
              />
              <small className="muted">
                Word, Excel, PDF, images, sons et videos sont acceptes.
              </small>
              {uploadState ? <small className="muted">{uploadState}</small> : null}
            </div>
          </label>
        </div>

        <div className="modal-form">
          <div className="side-box">
            <span className="side-title">Cover</span>
            <div className="cover-grid">
              {Object.entries(covers).map(([key, value]) => (
                <button
                  key={key}
                  className={`cover-swatch ${card.cover === key ? "selected" : ""}`}
                  type="button"
                  style={{ background: value }}
                  onClick={() =>
                    onUpdateCard(card.id, (draftCard) => {
                      draftCard.cover = key;
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div className="side-box">
            <span className="side-title">Labels</span>
            <div className="tag-grid">
              {workspace.labels.map((label) => (
                <button
                  key={label.id}
                  className={`tag-toggle ${card.labels.includes(label.id) ? "selected" : ""}`}
                  type="button"
                  style={{ borderColor: label.color }}
                  onClick={() =>
                    onUpdateCard(card.id, (draftCard) => {
                      if (draftCard.labels.includes(label.id)) {
                        draftCard.labels = draftCard.labels.filter((item) => item !== label.id);
                      } else {
                        draftCard.labels.push(label.id);
                      }
                    })
                  }
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
          <div className="side-box">
            <span className="side-title">Membres</span>
            <div className="tag-grid">
              {workspace.members.filter((member) => member.userId).map((member) => (
                <button
                  key={member.id}
                  className={`tag-toggle ${card.members.includes(member.id) ? "selected" : ""}`}
                  type="button"
                  onClick={() =>
                    onUpdateCard(card.id, (draftCard) => {
                      if (draftCard.members.includes(member.id)) {
                        draftCard.members = draftCard.members.filter((item) => item !== member.id);
                      } else {
                        draftCard.members.push(member.id);
                      }
                    })
                  }
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>
          <button
            className="secondary-btn danger"
            type="button"
            onClick={() => {
              onUpdateCard(card.id, (draftCard) => {
                draftCard.archived = true;
              });
              onClose();
            }}
          >
            Archiver la carte
          </button>
        </div>
      </div>
    </Modal>
  );
}

function App() {
  const [session, setSession] = useState({ status: "loading", user: null });
  const [workspace, setWorkspace] = useState(null);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [modal, setModal] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const firstLoad = useRef(true);

  useEffect(() => {
    const token = localStorage.getItem("trello2-token");
    if (!token) {
      setSession({ status: "guest", user: null });
      return;
    }

    api
      .me()
      .then((data) => {
        setSession({ status: "ready", user: data.user });
        setWorkspace(data.workspace);
        setActiveBoardId(data.workspace.boards[0]?.id || null);
      })
      .catch(() => {
        localStorage.removeItem("trello2-token");
        setSession({ status: "guest", user: null });
      });
  }, []);

  useEffect(() => {
    if (!workspace || session.status !== "ready") return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    setSaveState("saving");
    const timeout = setTimeout(() => {
      api
        .saveWorkspace(workspace)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 350);

    return () => clearTimeout(timeout);
  }, [workspace, session.status]);

  const board = workspace?.boards.find((item) => item.id === activeBoardId) || workspace?.boards[0];
  const realMembers = workspace?.members.filter((member) => member.userId) || [];
  const currentUserMember = realMembers.find((member) => member.userId === session.user?.id);

  useEffect(() => {
    if (!workspace?.boards?.length) return;
    if (!activeBoardId || !workspace.boards.some((item) => item.id === activeBoardId)) {
      setActiveBoardId(workspace.boards[0].id);
    }
  }, [workspace, activeBoardId]);

  function updateWorkspace(mutator) {
    setWorkspace((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  }

  function addActivity(text) {
    updateWorkspace((draft) => {
      draft.activity.unshift({
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString()
      });
      draft.activity = draft.activity.slice(0, 40);
    });
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "")
    };

    setAuthError("");
    const task = authMode === "login" ? api.login(payload) : api.register(payload);

    task
      .then((data) => {
        localStorage.setItem("trello2-token", data.token);
        setSession({ status: "ready", user: data.user });
        setWorkspace(data.workspace);
        setActiveBoardId(data.workspace.boards[0]?.id || null);
        firstLoad.current = true;
      })
      .catch((error) => setAuthError(error.message));
  }

  function logout() {
    localStorage.removeItem("trello2-token");
    setWorkspace(null);
    setSession({ status: "guest", user: null });
    setModal(null);
  }

  if (session.status === "loading") {
    return <div className="screen-state">Chargement de l'application...</div>;
  }

  if (session.status !== "ready" || !workspace) {
    return (
      <div className="auth-shell">
        <div className="auth-panel brand">
          <video className="brand-video" src="/3.mp4" autoPlay muted loop playsInline />
          <p className="eyebrow">Trello 2</p>
          <h1><strong>Une App pensée pour vous.</strong></h1>
          <p>
            Un outil de gestion de projet simple, rapide et efficace. Créez, organisez et gérez vos tâches en un clin
            d'œil.
          </p>
        </div>
        <form className="auth-panel form" onSubmit={handleAuthSubmit}>
          <p className="eyebrow">{authMode === "login" ? "Connexion" : "Inscription"}</p>
          <h2>{authMode === "login" ? "Reprendre ton workspace" : "Créer un compte"}</h2>
          {authMode === "register" ? (
            <label>
              <span>Nom</span>
              <input name="name" required placeholder="Ton nom" />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input name="email" type="email" required placeholder="toi@exemple.com" />
          </label>
          <label>
            <span>Mot de passe</span>
            <input name="password" type="password" required placeholder="••••••••" />
          </label>
          {authError ? <div className="error-box">{authError}</div> : null}
          <button className="primary-btn" type="submit">
            {authMode === "login" ? "Se connecter" : "Créer le compte"}
          </button>
          <button
            className="text-btn"
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </form>
      </div>
    );
  }

  const filteredCards = {};
  for (const list of board.lists) {
    filteredCards[list.id] = list.cards.filter((card) => {
      const text = `${card.title} ${card.description}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (memberFilter && !card.members.includes(memberFilter)) return false;
      if (labelFilter && !card.labels.includes(labelFilter)) return false;
      if (card.archived) return false;
      return true;
    });
  }

  function createBoard(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newBoard = {
      id: crypto.randomUUID(),
      name: String(form.get("name")).trim(),
      description: String(form.get("description")).trim(),
      cover: String(form.get("cover")),
      favorite: false,
      lists: [
        { id: crypto.randomUUID(), name: "To Do", cards: [] },
        { id: crypto.randomUUID(), name: "Doing", cards: [] },
        { id: crypto.randomUUID(), name: "Done", cards: [] }
      ]
    };
    updateWorkspace((draft) => draft.boards.unshift(newBoard));
    setActiveBoardId(newBoard.id);
    setModal(null);
  }

  function createList(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateWorkspace((draft) => {
      const targetBoard = draft.boards.find((item) => item.id === board.id);
      targetBoard.lists.push({
        id: crypto.randomUUID(),
        name: String(form.get("name")).trim(),
        cards: []
      });
    });
    setModal(null);
  }

  function renameBoard(boardId) {
    const target = workspace.boards.find((item) => item.id === boardId);
    const name = window.prompt("Nouveau nom du board", target?.name || "");
    if (!name) return;
    updateWorkspace((draft) => {
      const boardItem = draft.boards.find((item) => item.id === boardId);
      boardItem.name = name.trim();
    });
  }

  function deleteBoard(boardId) {
    if (workspace.boards.length === 1) {
      window.alert("Il faut garder au moins un board.");
      return;
    }
    if (!window.confirm("Supprimer ce board ?")) return;
    updateWorkspace((draft) => {
      draft.boards = draft.boards.filter((item) => item.id !== boardId);
    });
    if (activeBoardId === boardId) {
      const fallback = workspace.boards.find((item) => item.id !== boardId);
      setActiveBoardId(fallback?.id || null);
    }
  }

  function renameList(listId) {
    const target = board.lists.find((item) => item.id === listId);
    const name = window.prompt("Nouveau nom de la liste", target?.name || "");
    if (!name) return;
    updateWorkspace((draft) => {
      const list = draft.boards.find((item) => item.id === board.id).lists.find((item) => item.id === listId);
      list.name = name.trim();
    });
  }

  function deleteList(listId) {
    if (!window.confirm("Supprimer cette liste ?")) return;
    updateWorkspace((draft) => {
      const targetBoard = draft.boards.find((item) => item.id === board.id);
      targetBoard.lists = targetBoard.lists.filter((item) => item.id !== listId);
    });
  }

  function createCard(event, listId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    if (!title) return;
    updateWorkspace((draft) => {
      const targetList = draft.boards
        .find((item) => item.id === board.id)
        .lists.find((item) => item.id === listId);
      targetList.cards.push({
        id: crypto.randomUUID(),
        title,
        description: "",
        dueDate: "",
        labels: [],
        members: [],
        cover: "",
        checklist: [],
        comments: [],
        attachments: [],
        archived: false,
        createdAt: new Date().toISOString()
      });
    });
    addActivity(`Carte "${title}" ajoutée`);
    event.currentTarget.reset();
  }

  function moveCard(cardId, fromListId, toListId) {
    if (fromListId === toListId) return;
    updateWorkspace((draft) => {
      const targetBoard = draft.boards.find((item) => item.id === board.id);
      const fromList = targetBoard.lists.find((item) => item.id === fromListId);
      const toList = targetBoard.lists.find((item) => item.id === toListId);
      const index = fromList.cards.findIndex((item) => item.id === cardId);
      if (index < 0) return;
      const [card] = fromList.cards.splice(index, 1);
      toList.cards.push(card);
    });
  }

  function updateCard(cardId, mutator) {
    updateWorkspace((draft) => {
      for (const draftBoard of draft.boards) {
        for (const list of draftBoard.lists) {
          const card = list.cards.find((item) => item.id === cardId);
          if (card) {
            mutator(card, list, draftBoard);
            return;
          }
        }
      }
    });
  }

  function findCard(cardId) {
    for (const list of board.lists) {
      const card = list.cards.find((item) => item.id === cardId);
      if (card) return { card, list };
    }
    return null;
  }

  const currentCard = modal?.type === "card" ? findCard(modal.cardId) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="workspace-brand">
          <p className="eyebrow">Workspace</p>
          <h1>Trello 2</h1>
          <p className="muted">Connecté en tant que {session.user.name}</p>
        </div>

        <section className="sidebar-card">
          <div className="section-row">
            <h2>Boards</h2>
            <button className="text-btn" type="button" onClick={() => setModal({ type: "create-board" })}>
              Nouveau
            </button>
          </div>
          <div className="board-menu">
            {workspace.boards.map((item) => (
              <div key={item.id} className={`board-link-wrap ${item.id === board.id ? "active" : ""}`}>
                <button
                  className={`board-link ${item.id === board.id ? "active" : ""}`}
                  onClick={() => setActiveBoardId(item.id)}
                >
                  <span className="board-link-cover" style={{ background: covers[item.cover] }} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
                <div className="mini-actions">
                  <button className="text-btn" type="button" onClick={() => renameBoard(item.id)}>
                    Renommer
                  </button>
                  <button className="text-btn danger-text" type="button" onClick={() => deleteBoard(item.id)}>
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar-card">
          <h2>Filtres</h2>
          <label>
            <span>Recherche</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher une carte" />
          </label>
          <label>
            <span>Membre</span>
            <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
              <option value="">Tous</option>
              {realMembers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Label</span>
            <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
              <option value="">Tous</option>
              {workspace.labels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="sidebar-card">
          <div className="section-row">
            <h2>Équipe</h2>
            <span className={`sync-state ${saveState}`}>
              {saveState === "saving" ? "Sync..." : saveState === "saved" ? "Sauvé" : "Erreur"}
            </span>
          </div>
          <div className="member-list">
            {currentUserMember ? (
              <div className="member-row">
                <span className="avatar" style={{ background: currentUserMember.color }}>
                  {currentUserMember.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{currentUserMember.name}</strong>
                  <small>{currentUserMember.role}</small>
                </div>
              </div>
            ) : null}

          </div>
          <button className="secondary-btn" type="button" onClick={logout}>
            Déconnexion
          </button>
        </section>
      </aside>

      <main className="main-shell">
        <header className="board-hero" style={{ background: covers[board.cover] }}>
          <div>
            <p className="eyebrow light">Board</p>
            <h2>{board.name}</h2>
            <p>{board.description}</p>
          </div>
          <div className="hero-actions">
            <button className="secondary-btn soft" type="button" onClick={() => setModal({ type: "create-list" })}>
              Ajouter une liste
            </button>
            <button className="secondary-btn soft" type="button" onClick={() => setModal({ type: "archive" })}>
              Archives
            </button>
            <button className="secondary-btn soft" type="button" onClick={() => renameBoard(board.id)}>
              Renommer
            </button>
          </div>
        </header>

        <section className="board-stats">
          <div>
            <strong>{board.lists.length}</strong>
            <span>listes</span>
          </div>
          <div>
            <strong>
              {board.lists.reduce((total, list) => total + list.cards.filter((card) => !card.archived).length, 0)}
            </strong>
            <span>cartes</span>
          </div>
          <div>
            <strong>{workspace.activity.length}</strong>
            <span>événements</span>
          </div>
        </section>

        <section className="board-canvas">
          {board.lists.map((list) => (
            <article key={list.id} className="list-panel">
              <div className="list-header">
                <h3>{list.name}</h3>
                <div className="mini-actions">
                  <span>{filteredCards[list.id].length}</span>
                  <button className="text-btn" type="button" onClick={() => renameList(list.id)}>
                    Renommer
                  </button>
                  <button className="text-btn danger-text" type="button" onClick={() => deleteList(list.id)}>
                    Suppr.
                  </button>
                </div>
              </div>

              <div
                className="card-stack"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const payload = JSON.parse(event.dataTransfer.getData("application/json"));
                  moveCard(payload.cardId, payload.fromListId, list.id);
                }}
              >
                {filteredCards[list.id].map((card) => (
                  <button
                    key={card.id}
                    className="card-tile"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({ cardId: card.id, fromListId: list.id })
                      );
                    }}
                    onClick={() => setModal({ type: "card", cardId: card.id })}
                  >
                    {card.cover ? (
                      <span className="card-cover" style={{ background: covers[card.cover] }} />
                    ) : null}
                    <div className="label-row">
                      {card.labels.map((labelId) => {
                        const label = workspace.labels.find((item) => item.id === labelId);
                        if (!label) return null;
                        return (
                          <span key={label.id} className="label-pill" style={{ background: label.color }}>
                            {label.name}
                          </span>
                        );
                      })}
                    </div>
                    <strong>{card.title}</strong>
                    <p>{card.description || "Ouvre la carte pour ajouter plus de détails."}</p>
                    <div className="card-meta">
                      {card.dueDate ? <span>Échéance {card.dueDate}</span> : <span>Sans date</span>}
                      <span>
                        {card.checklist.filter((item) => item.done).length}/{card.checklist.length} tâches
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <form className="inline-form" onSubmit={(event) => createCard(event, list.id)}>
                <input name="title" placeholder="Ajouter une carte..." />
                <button className="primary-btn" type="submit">
                  Ajouter
                </button>
              </form>
            </article>
          ))}
        </section>
      </main>

      {modal?.type === "create-board" ? (
        <Modal title="Créer un board" onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={createBoard}>
            <label>
              <span>Nom</span>
              <input name="name" required placeholder="Ex: Growth Sprint" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="description" placeholder="But du board" />
            </label>
            <label>
              <span>Cover</span>
              <select name="cover" defaultValue="ocean">
                {Object.keys(covers).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-btn" type="submit">
              Créer
            </button>
          </form>
        </Modal>
      ) : null}

      {modal?.type === "create-list" ? (
        <Modal title="Ajouter une liste" onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={createList}>
            <label>
              <span>Nom</span>
              <input name="name" required placeholder="Ex: Review" />
            </label>
            <button className="primary-btn" type="submit">
              Ajouter
            </button>
          </form>
        </Modal>
      ) : null}

      {modal?.type === "archive" ? (
        <Modal title="Cartes archivées" onClose={() => setModal(null)}>
          <div className="archive-list">
            {board.lists.flatMap((list) => list.cards.filter((card) => card.archived)).length ? (
              board.lists.flatMap((list) =>
                list.cards
                  .filter((card) => card.archived)
                  .map((card) => (
                    <div key={card.id} className="archive-item">
                      <strong>{card.title}</strong>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => {
                          updateCard(card.id, (draftCard) => {
                            draftCard.archived = false;
                          });
                          setModal(null);
                        }}
                      >
                        Restaurer
                      </button>
                    </div>
                  ))
              )
            ) : (
              <div className="empty-box">Aucune carte archivée sur ce board.</div>
            )}
          </div>
        </Modal>
      ) : null}

      {modal?.type === "card" && currentCard ? (
        <CardModal
          data={currentCard}
          workspace={workspace}
          onClose={() => setModal(null)}
          onUpdateCard={updateCard}
        />
      ) : null}
    </div>
  );
}

export default App;

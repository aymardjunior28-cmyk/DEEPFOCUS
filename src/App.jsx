import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Dashboard } from "./Dashboard";

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

function CardModal({ data, workspace, onClose, onUpdateCard, onWorkspaceUpdate }) {
  const { card } = data;
  const [uploadState, setUploadState] = useState("");
  const fileInputId = `file-${card.id}`;
  const fileInputRef = useRef(null);

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
                        if (target) target.done = event.target.checked;
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
                <div key={file.id} className="attachment-row">
                  <a className="attachment-link" href={file.url} target="_blank" rel="noreferrer">
                    <strong>{file.name}</strong>
                    <small>{file.mimeType || "fichier"}</small>
                  </a>
                  <button
                    type="button"
                    className="text-btn danger-text"
                    onClick={() =>
                      onUpdateCard(card.id, (draftCard) => {
                        draftCard.attachments = draftCard.attachments.filter((item) => item.id !== file.id);
                      })
                    }
                  >
                    Supprimer
                  </button>
                </div>
              ))}
              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                onChange={() => {
                  const input = fileInputRef.current;
                  const file = input?.files?.[0];
                  if (!file) return;
                  setUploadState("uploading");
                  api
                    .uploadAttachment(card.id, file)
                    .then((data) => {
                      setUploadState("done");
                      if (data.workspace) {
                        onWorkspaceUpdate(data.workspace);
                      }
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
  const [saveState, setSaveState] = useState("saved");
  const firstLoad = useRef(true);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("deepfocus-token");
    console.log("App mounted, token present:", Boolean(token));
    if (!token) {
      setSession({ status: "guest", user: null });
      return;
    }

    console.log("Calling api.me() to restore session");
    api
      .me()
      .then((data) => {
        console.log("api.me() success", data);
        const restoredWorkspace = data.workspace || { boards: [], members: [], invitations: [], notifications: [], activity: [], tasks: [], labels: [] };
        setSession({ status: "ready", user: data.user });
        setWorkspace(restoredWorkspace);
        setActiveBoardId(restoredWorkspace.boards?.[0]?.id || null);
      })
      .catch((error) => {
        console.error("api.me() failed", error);
        sessionStorage.removeItem("deepfocus-token");
        setSession({ status: "guest", user: null });
      });
  }, []);

  // Écouter les mises à jour SSE du workspace en temps réel
  useEffect(() => {
    const token = sessionStorage.getItem("deepfocus-token");
    if (!token || session.status !== "ready") return;

    const eventSource = new EventSource(`/api/workspace/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.workspace) {
          setWorkspace(data.workspace);
        }
      } catch (err) {
        console.error("Erreur parsing SSE:", err);
      }
    });

    eventSource.addEventListener("error", () => {
      console.error("Erreur SSE - reconnexion...");
      eventSource.close();
      eventSourceRef.current = null;
    });

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [session.status]);

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

  const safeBoards = Array.isArray(workspace?.boards) ? workspace.boards : [];
  const safeMembers = Array.isArray(workspace?.members) ? workspace.members : [];
  const board = safeBoards.find((item) => item.id === activeBoardId) || safeBoards[0] || { id: null, name: "", description: "", cover: "", favorite: false, lists: [] };
  const boardLists = Array.isArray(board.lists) ? board.lists : [];
  const realMembers = safeMembers.filter((member) => member.userId) || [];
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
        console.log("Auth success", { authMode, data });
        sessionStorage.setItem("deepfocus-token", data.token);
        setSession({ status: "ready", user: data.user });
        const workspace = data.workspace || {
          id: null,
          name: "Global",
          boards: [],
          members: [],
          invitations: [],
          activity: [],
          tasks: [],
          labels: [],
          notifications: []
        };
        setWorkspace(workspace);
        setActiveBoardId(workspace.boards[0]?.id || null);
        firstLoad.current = true;
      })
      .catch((error) => {
        console.error("Auth error", error);
        setAuthError(error.message);
      });
  }

  function logout() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    sessionStorage.removeItem("deepfocus-token");
    setWorkspace(null);
    setSession({ status: "guest", user: null });
  }

  function handleDeleteAccount() {
    if (!window.confirm("Voulez-vous vraiment supprimer définitivement votre compte ?")) {
      return;
    }

    api
      .deleteAccount()
      .then(() => {
        logout();
        alert("Compte supprimé.");
      })
      .catch((error) => {
        if (error.message?.includes("Token")) {
          logout();
          alert("Session expirée ou invalide. Veuillez vous reconnecter pour supprimer votre compte.");
          return;
        }

        alert(error.message || "Impossible de supprimer le compte.");
      });
  }

  if (session.status === "loading") {
    return <div className="screen-state">Chargement de l'application...</div>;
  }

  if (session.status !== "ready" || workspace === null) {
    return (
      <div className="auth-shell">
        <div className="auth-panel brand">
          <video className="brand-video" src="/3.mp4" autoPlay muted loop playsInline />
          <p className="eyebrow">DeepFocus</p>
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
  for (const list of boardLists) {
    filteredCards[list.id] = Array.isArray(list.cards)
      ? list.cards.filter((card) => {
          const text = `${card.title} ${card.description}`.toLowerCase();
          if (search && !text.includes(search.toLowerCase())) return false;
          if (memberFilter && !card.members.includes(memberFilter)) return false;
          if (labelFilter && !card.labels.includes(labelFilter)) return false;
          if (card.archived) return false;
          return true;
        })
      : [];
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
    <Dashboard 
      workspace={workspace} 
      user={session.user}
      onLogout={() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        sessionStorage.removeItem("deepfocus-token");
        setSession({ status: "guest" });
      }}
      onJoinWorkspace={() => {
        // Rafraîchir après avoir rejoint un workspace
        api.me().then((data) => {
          setWorkspace(data.workspace);
          setActiveBoardId(data.workspace.boards[0]?.id || null);
        }).catch(console.error);
      }}
    />
  );
}

export default App;

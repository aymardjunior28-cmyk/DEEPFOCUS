import { useState } from "react";
import { PlanningView, NotificationsPanel } from "./components/Planning";
import { InvitationsManager, PendingInvitationsAlert } from "./components/Invitations";

import { api } from "./api";

export function Dashboard({ workspace, user, onLogout, onJoinWorkspace }) {
  const [activeTab, setActiveTab] = useState("planning");
  const [tasks, setTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isOwner = workspace?.members?.find((m) => m.userId === user?.id)?.role === "Owner";

  async function handleDeleteAccount() {
    if (!window.confirm("⚠️ Êtes-vous sûr ? Cela supprimera DÉFINITIVEMENT votre compte et toutes vos données.")) {
      return;
    }
    if (!window.confirm("Confirmez-vous vraiment ? C'est irréversible.")) {
      return;
    }

    try {
      await api.deleteAccount();
      window.alert("✅ Compte supprimé avec succès.");
      onLogout();
    } catch (error) {
      window.alert(`❌ Erreur : ${error.message}`);
    }
  }

  const memberCount = workspace?.members?.filter((m) => m.userId).length || 0;

  return (
    <div className="store-shell">
      <aside className="store-sidebar">
        <div className="store-brand">
          <div className="store-brand-mark" aria-hidden="true">
            DF
          </div>
          <div className="store-brand-text">
            <strong>DeepFocus</strong>
            <small>Workspace</small>
          </div>
        </div>

        <nav className="store-nav" aria-label="Navigation">
          <button
            className={`store-nav-btn ${activeTab === "planning" ? "active" : ""}`}
            onClick={() => setActiveTab("planning")}
            type="button"
            title="Planning"
          >
            <span className="store-nav-ico" aria-hidden="true">
              📅
            </span>
            <span className="store-nav-label">Planning</span>
          </button>
          <button
            className={`store-nav-btn ${activeTab === "invitations" ? "active" : ""}`}
            onClick={() => setActiveTab("invitations")}
            type="button"
            title="Membres"
          >
            <span className="store-nav-ico" aria-hidden="true">
              👥
            </span>
            <span className="store-nav-label">Membres</span>
          </button>
        </nav>

        <div className="store-sidebar-bottom">
          <button
            className={`store-icon-btn ${showNotifications ? "active" : ""}`}
            onClick={() => setShowNotifications(!showNotifications)}
            type="button"
            title="Notifications"
          >
            🔔
          </button>
          <button className="store-icon-btn" onClick={onLogout} type="button" title="Déconnexion">
            ⎋
          </button>
          <button className="store-icon-btn danger" onClick={handleDeleteAccount} type="button" title="Supprimer le compte">
            🗑️
          </button>
        </div>
      </aside>

      <div className="store-main">
        <header className="store-topbar">
          <div className="store-search">
            <span className="store-search-ico" aria-hidden="true">
              🔎
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des tâches, des descriptions…"
              aria-label="Rechercher"
            />
          </div>

          <div className="store-top-actions">
            <div className="store-user-chip" title={user?.email || ""}>
              <span className="store-user-avatar" aria-hidden="true">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </span>
              <div className="store-user-meta">
                <strong>{user?.name || "Utilisateur"}</strong>
                <small>{isOwner ? "Owner" : "Member"}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="store-scroll">
          <div className="store-hero-grid">
            <section className="store-hero store-hero-primary">
              <div className="store-hero-body">
                <h2>Workspace collaboratif</h2>
                <p>Tous les membres travaillent sur le même espace en temps réel.</p>
                <div className="store-hero-actions">
                  <button className="secondary-btn soft" type="button" onClick={onJoinWorkspace}>
                    Rejoindre / Rafraîchir
                  </button>
                </div>
              </div>
              <div className="store-hero-side" aria-hidden="true">
                <div className="store-hero-kpi">
                  <strong>{memberCount}</strong>
                  <small>Membres</small>
                </div>
                <div className="store-hero-kpi">
                  <strong>{tasks.length}</strong>
                  <small>Tâches (vue)</small>
                </div>
              </div>
            </section>

            <section className="store-hero store-hero-secondary">
              <div className="store-hero-body">
                <h2>Centre de productivité</h2>
                <p>Filtre par recherche, gère les assignations, et suis les notifications.</p>
                <div className="store-hero-actions">
                  <button className="secondary-btn soft" type="button" onClick={() => setShowNotifications(true)}>
                    Ouvrir les notifications
                  </button>
                </div>
              </div>
            </section>
          </div>

          <PendingInvitationsAlert workspace={workspace} />

          <div className="store-content-grid">
            <section className="store-panel">
              {activeTab === "planning" && (
                <PlanningView workspace={workspace} onTasksChange={setTasks} searchQuery={searchQuery} />
              )}
              {activeTab === "invitations" && <InvitationsManager workspace={workspace} />}
            </section>

            {showNotifications && (
              <aside className="store-rightpane">
                <NotificationsPanel workspace={workspace} />
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { api } from "../api";

export function InvitationsManager({ workspace }) {
  const [invitations, setInvitations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, [workspace]);

  async function loadInvitations() {
    try {
      const response = await api.get("/invitations");
      setInvitations(response.invitations || []);
    } catch (err) {
      console.error("Erreur chargement invitations:", err);
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${memberName} ?`)) {
      return;
    }

    setRemoving(memberId);
    setError("");
    setMessage("");
    try {
      await api.removeMember(memberId);
      setMessage(`${memberName} a été supprimé du workspace`);
      loadInvitations();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression");
    } finally {
      setRemoving(null);
    }
  }

  async function sendInvitation() {
    if (!email.trim()) {
      setError("Veuillez entrer une adresse email");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.sendInvitation({ email: email.trim() });
      setMessage("Invitation envoyée avec succès !");
      setEmail("");
      setShowForm(false);
      loadInvitations();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi de l'invitation");
    } finally {
      setLoading(false);
    }
  }
  const members = Array.isArray(workspace?.members) ? workspace.members.filter(Boolean) : [];
  const memberCount = members.filter((m) => m.userId).length;
  const canInvite = members.find((m) => m.userId);
  const onlineUserIds = workspace?.onlineUserIds || [];

  return (
    <div className="invitations-manager">
      <div className="manager-header">
        <h3>Gestion des membres</h3>
        <span className="member-count">{memberCount} / 6 membres</span>
      </div>

      {canInvite && (
        <>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <div className="members-list">
            <h4>Membres actuels</h4>
            {members.map(member => {
              const isOnline = onlineUserIds.includes(member.userId);
              return (
                <div key={member.id} className="member-item">
                  <div
                    className="member-avatar"
                    style={{ backgroundColor: member.color, position: "relative" }}
                  >
                    {member.name[0]}
                    {isOnline && <span className="online-indicator" title="En ligne"></span>}
                  </div>
                  <div className="member-info">
                    <strong>{member.name}</strong>
                    <small>{member.role} {isOnline ? "🟢" : "⚪"}</small>
                  </div>
                  <button
                    className="member-remove-btn"
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    disabled={removing === member.id}
                    title="Supprimer ce membre"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {memberCount < 6 && (
            <>
              {!showForm && (
                <button
                  className="primary-btn"
                  onClick={() => setShowForm(true)}
                >
                  + Inviter un utilisateur
                </button>
              )}

              {showForm && (
                <div className="invitation-form">
                  <label>
                    Email de l'utilisateur
                    <input
                      type="email"
                      placeholder="utilisateur@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyPress={e => e.key === "Enter" && sendInvitation()}
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      className="primary-btn"
                      onClick={sendInvitation}
                      disabled={loading}
                    >
                      {loading ? "Envoi..." : "Envoyer"}
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setShowForm(false);
                        setError("");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {invitations.length > 0 && (
            <div className="pending-invitations">
              <h4>Invitations en attente</h4>
              {invitations.map(inv => (
                <div key={inv.id} className="invitation-item">
                  <div>
                    <strong>{inv.email}</strong>
                    <small>Status: {inv.status}</small>
                  </div>
                  <small className="invitation-date">
                    {new Date(inv.createdAt).toLocaleDateString("fr-FR")}
                  </small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PendingInvitationsAlert({ workspace }) {
  const [pendingInvitations, setPendingInvitations] = useState([]);

  useEffect(() => {
    loadPendingInvitations();
  }, [workspace]);

  async function loadPendingInvitations() {
    try {
      const response = await api.get("/invitations");
      const pending = (response.invitations || []).filter(i => i.status === "pending");
      setPendingInvitations(pending);
    } catch (err) {
      console.error("Erreur chargement invitations:", err);
    }
  }

  async function acceptInvitation(invitationId) {
    try {
      await api.acceptInvitation(invitationId);
      loadPendingInvitations();
    } catch (err) {
      console.error("Erreur acceptation invitation:", err);
    }
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="pending-invitations-alert">
      <h3>Vous avez {pendingInvitations.length} invitation(s)</h3>
      {pendingInvitations.map(inv => (
        <div key={inv.id} className="invitation-alert-item">
          <span>Vous avez été invité à rejoindre un espace</span>
          <button
            className="primary-btn small"
            onClick={() => acceptInvitation(inv.id)}
          >
            Accepter
          </button>
        </div>
      ))}
    </div>
  );
}
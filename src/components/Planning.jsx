import { useEffect, useState } from "react";
import { api } from "../api";

export function PlanningView({ workspace, onTasksChange, searchQuery = "" }) {
  const [view, setView] = useState("week"); // day, week, month
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: selectedDate,
    endDate: selectedDate,
    assignedTo: [],
    priority: "medium"
  });

  useEffect(() => {
    loadTasks();
  }, [view, selectedDate, workspace]);

  useEffect(() => {
    if (!selectedTask) return;
    const refreshedTask = tasks.find((task) => task.id === selectedTask.id);
    if (refreshedTask && refreshedTask !== selectedTask) {
      setSelectedTask(refreshedTask);
    }
  }, [tasks, selectedTask]);

  async function loadTasks() {
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();

      const response = await api.get("/tasks", {
        params: {
          view,
          startDate,
          endDate
        }
      });

      setTasks(response.tasks || []);
      onTasksChange?.(response.tasks || []);
    } catch (err) {
      console.error("Erreur chargement tâches:", err);
    }
  }

  function getStartDate() {
    const date = new Date(selectedDate);
    if (view === "week") {
      date.setDate(date.getDate() - date.getDay() + 1);
    } else if (view === "month") {
      date.setDate(1);
    }
    return date.toISOString().split("T")[0];
  }

  function getEndDate() {
    const date = new Date(selectedDate);
    if (view === "day") {
      return selectedDate;
    } else if (view === "week") {
      date.setDate(date.getDate() - date.getDay() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
    }
    return date.toISOString().split("T")[0];
  }

  async function createTask() {
    if (!formData.title.trim()) return;

    try {
      const response = await api.createTask({
        ...formData,
        startDate: formData.startDate || selectedDate,
        endDate: formData.endDate || selectedDate
      });
      if (response?.task?.id && uploadedFiles.length > 0) {
        for (const uploadedFile of uploadedFiles) {
          if (uploadedFile.file) {
            await api.uploadTaskAttachment(response.task.id, uploadedFile.file);
          }
        }
      }
      setFormData({
        title: "",
        description: "",
        startDate: selectedDate,
        endDate: selectedDate,
        assignedTo: [],
        priority: "medium"
      });
      setUploadedFiles([]);
      setShowCreateForm(false);
      loadTasks();
    } catch (err) {
      console.error("Erreur création tâche:", err);
    }
  }

  async function updateTask(taskId, updates) {
    try {
      await api.updateTask(taskId, updates);
      loadTasks();
    } catch (err) {
      console.error("Erreur mise à jour tâche:", err);
    }
  }

  async function deleteTask(taskId) {
    try {
      await api.deleteTask(taskId);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      loadTasks();
    } catch (err) {
      console.error("Erreur suppression tâche:", err);
    }
  }

  async function uploadTaskFile(file) {
    if (!selectedTask || !file) return;

    setUploadingTaskFile(true);
    try {
      await api.uploadTaskAttachment(selectedTask.id, file);
      await loadTasks();
    } catch (err) {
      console.error("Erreur upload fichier tâche:", err);
    } finally {
      setUploadingTaskFile(false);
    }
  }

  function formatFileSize(value) {
    if (typeof value === "string") return value;
    if (typeof value !== "number" || Number.isNaN(value)) return "Taille inconnue";
    if (value < 1024) return `${value} o`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
    return `${(value / 1024 / 1024).toFixed(2)} Mo`;
  }

  function formatTaskDate(value) {
    if (!value) return "Non renseignée";
    return new Date(value).toLocaleDateString("fr-FR");
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        type: file.type,
        file
      }));
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  }

  function removeFile(index) {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  }

  function getTasksForDate(date) {
    const query = String(searchQuery || "").trim().toLowerCase();
    return tasks.filter(t => {
      if (t.startDate !== date) return false;
      if (!query) return true;
      const text = `${t.title || ""} ${t.description || ""}`.toLowerCase();      return text.includes(query);
    });
  }

  function renderDayView() {
    const dayTasks = getTasksForDate(selectedDate);
    return (
      <div className="planning-day">
        <div className="day-header">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="tasks-list">
          {dayTasks.length === 0 ? (
            <p className="empty-state">Aucune tâche pour ce jour</p>
          ) : (
            dayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                workspace={workspace}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onSelect={() => setSelectedTask(task)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    return (
      <div className="planning-week">
        <div className="week-header">
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 7);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}>← Semaine précédente</button>
          <span>{startDate.toLocaleDateString()} - {new Date(weekDays[6]).toLocaleDateString()}</span>
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 7);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}>Semaine suivante →</button>
        </div>
        <div className="week-grid">
          {weekDays.map(date => (
            <div key={date} className="week-day">
              <div className="day-label">{new Date(date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</div>
              {getTasksForDate(date).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  workspace={workspace}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onSelect={() => setSelectedTask(task)}
                  compact
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderMonthView() {
    const date = new Date(selectedDate);
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }

    return (
      <div className="planning-month">
        <div className="month-header">
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() - 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}>← Mois précédent</button>
          <h2>{date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() + 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}>Mois suivant →</button>
        </div>
        <div className="month-grid">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
            const dayTasks = dateStr ? getTasksForDate(dateStr) : [];
            return (
              <div 
                key={idx} 
                className={`calendar-day ${day ? "" : "empty"} ${day ? "clickable" : ""}`}
                onClick={() => day && setSelectedDate(dateStr)}
              >
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    <div className="day-tasks">
                      {dayTasks.slice(0, 2).map(task => (
                        <div 
                          key={task.id} 
                          className={`task-dot priority-${task.priority}`} 
                          title={task.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                        />
                      ))}
                      {dayTasks.length > 2 && <div className="task-dots">+{dayTasks.length - 2}</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="planning-container">
      <div className="planning-toolbar">
        <div className="view-buttons">
          <button
            className={view === "day" ? "active" : ""}
            onClick={() => setView("day")}
          >
            Jour
          </button>
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Semaine
          </button>
          <button
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Mois
          </button>
        </div>
        <button className="primary-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
          + Nouvelle tâche
        </button>
      </div>

      {showCreateForm && (
        <div className="create-task-form">
          <input
            type="text"
            placeholder="Titre de la tâche"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="form-row">
            <label>
              Début
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </label>
            <label>
              Fin
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </label>
          </div>
          <label>
            Priorité
            <select
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Basse</option>
              <option value="medium">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label>
            Assigner à
            <div className="members-checkbox">
              {workspace?.members?.filter(m => m.userId).map(member => (
                <label key={member.id}>
                  <input
                    type="checkbox"
                    checked={formData.assignedTo.includes(member.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          assignedTo: [...formData.assignedTo, member.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          assignedTo: formData.assignedTo.filter(id => id !== member.id)
                        });
                      }
                    }}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </label>

          <div 
            className={`drag-drop-zone ${dragActive ? "active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drag-drop-content">
              <span className="drag-icon">📎</span>
              <p>Glissez vos fichiers ici</p>
              <small>Accepte : images, PDF, Word, Excel, vidéos, sons, etc.</small>
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="files-list">
              <h4>Fichiers ajoutés ({uploadedFiles.length})</h4>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="file-item">
                  <span>📄 {file.name}</span>
                  <small>{file.size}</small>
                  <button 
                    type="button"
                    className="text-btn danger-text"
                    onClick={() => removeFile(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="form-actions">
            <button className="primary-btn" onClick={createTask}>Créer</button>
            <button className="secondary-btn" onClick={() => {
              setShowCreateForm(false);
              setUploadedFiles([]);
            }}>Annuler</button>
          </div>
        </div>
      )}

      <div className="planning-content">
        {view === "day" && renderDayView()}
        {view === "week" && renderWeekView()}
        {view === "month" && renderMonthView()}
      </div>

      {selectedTask && (
        <div className="modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTask.title}</h3>
              <button className="text-btn" onClick={() => setSelectedTask(null)}>Fermer</button>
            </div>
            <div className="task-detail-grid">
              <div className="task-detail-main">
                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{selectedTask.description || "Aucune description"}</p>
                </div>
                <div className="detail-section">
                  <h4>Pièces jointes</h4>
                  <label className="task-upload-box">
                    <span>Ajouter un fichier</span>
                    <input
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        uploadTaskFile(file);
                        event.target.value = "";
                      }}
                      disabled={uploadingTaskFile}
                    />
                  </label>
                  {uploadingTaskFile && <small className="muted">Téléversement en cours...</small>}
                  {(selectedTask.attachments || []).length === 0 ? (
                    <p>Aucune pièce jointe</p>
                  ) : (
                    <div className="task-attachments-list">
                      {(selectedTask.attachments || []).map((file) => (
                        <div key={file.id || `${file.name}-${file.createdAt}`} className="task-attachment-item">
                          <div className="task-attachment-info">
                            <strong>{file.name}</strong>
                            <small>
                              {formatFileSize(file.size)}{file.mimeType ? ` • ${file.mimeType}` : ""}
                            </small>
                          </div>
                          <div className="task-attachment-actions">
                            {file.url ? (
                              <>
                                <a
                                  className="secondary-btn"
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ouvrir
                                </a>
                                <a
                                  className="secondary-btn"
                                  href={file.url}
                                  download={file.name}
                                >
                                  Télécharger
                                </a>
                              </>
                            ) : (
                              <small className="muted">Fichier non téléchargeable</small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="detail-section">
                  <h4>Statut</h4>
                  <div className="task-status">
                    <input 
                      type="checkbox" 
                      checked={selectedTask.completed || false}
                      onChange={e => {
                        updateTask(selectedTask.id, { completed: e.target.checked });
                        setSelectedTask(null);
                      }}
                    />
                    <span>{selectedTask.completed ? "✅ Complétée" : "⏳ En cours"}</span>
                  </div>
                </div>
              </div>
              <div className="task-detail-side">
                <div className="detail-section">
                  <h4>Dates</h4>
                  <p><strong>Début :</strong> {formatTaskDate(selectedTask.startDate)}</p>
                  <p><strong>Fin :</strong> {formatTaskDate(selectedTask.endDate)}</p>
                  <p><strong>Créée le :</strong> {formatTaskDate(selectedTask.createdAt)}</p>
                </div>
                <div className="detail-section">
                  <h4>Priorité</h4>
                  <span className="priority-badge" style={{
                    background: selectedTask.priority === "high" ? "#dc2626" : selectedTask.priority === "medium" ? "#f59e0b" : "#16a34a"
                  }}>
                    {selectedTask.priority === "high" ? "🔴 Haute" : selectedTask.priority === "medium" ? "🟡 Normale" : "🟢 Basse"}
                  </span>
                </div>
                <div className="detail-section">
                  <h4>Assignés</h4>
                  <div className="assigned-members">
                    {workspace?.members?.filter(m => selectedTask.assignedTo?.includes(m.id)).map(member => (
                      <div key={member.id} className="member-badge">
                        <span className="avatar" style={{ background: member.color || "#2563eb" }}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </span>
                        {member.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, workspace, onUpdate, onDelete, onSelect, compact = false }) {
  const assignedMembers = workspace?.members?.filter(m => task.assignedTo.includes(m.id)) || [];
  const priorityColors = {
    low: "#16a34a",
    medium: "#f59e0b",
    high: "#dc2626"
  };

  if (compact) {
    return (
      <div 
        className="task-card-compact" 
        style={{ borderLeft: `3px solid ${priorityColors[task.priority]}` }}
        onClick={onSelect}
        role="button"
        tabIndex={0}
      >
        <div className="task-title-compact">{task.title}</div>
        {assignedMembers.length > 0 && (
          <div className="task-members-compact">
            {assignedMembers.map(m => (
              <div
                key={m.id}
                className="member-avatar-small"
                style={{ backgroundColor: m.color }}
                title={m.name}
              >
                {m.name[0]}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="task-card" 
      style={{ borderLeft: `4px solid ${priorityColors[task.priority]}` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="task-header">
        <h4>{task.title}</h4>
        <button
          className="text-btn danger-text"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          ×
        </button>
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta">
        <span className="task-priority">{task.priority}</span>
        <span className="task-date">
          {new Date(task.startDate).toLocaleDateString("fr-FR")}
          {task.endDate !== task.startDate && ` - ${new Date(task.endDate).toLocaleDateString("fr-FR")}`}
        </span>
      </div>
      {assignedMembers.length > 0 && (
        <div className="task-members">
          {assignedMembers.map(m => (
            <div
              key={m.id}
              className="member-avatar"
              style={{ backgroundColor: m.color }}
              title={m.name}
            >
              {m.name[0]}
            </div>
          ))}
        </div>
      )}
      <label className="task-checkbox">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={e => onUpdate(task.id, { completed: e.target.checked })}
        />
        Marquer comme complétée
      </label>
    </div>
  );
}

export function NotificationsPanel({ workspace }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [workspace]);

  async function loadNotifications() {
    try {
      const response = await api.getNotifications();
      const notifs = (response.notifications || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await api.markNotificationAsRead(notificationId);
      loadNotifications();
    } catch (err) {
      console.error("Erreur marquage notification:", err);
    }
  }

  async function deleteNotification(notificationId) {
    setDeletingId(notificationId);
    try {
      await api.deleteNotification(notificationId);
      await loadNotifications();
    } catch (err) {
      console.error("Erreur suppression notification:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function clearNotifications() {
    if (!notifications.length) return;
    if (!window.confirm("Voulez-vous vraiment supprimer toutes vos notifications ?")) {
      return;
    }

    setClearingAll(true);
    try {
      await api.clearNotifications();
      await loadNotifications();
    } catch (err) {
      console.error("Erreur suppression de toutes les notifications:", err);
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div className="notifications-panel">
      <div className="notif-header">
        <h3>Notifications</h3>
        <div className="notif-header-actions">
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          {notifications.length > 0 && (
            <button
              type="button"
              className="notif-clear-btn"
              onClick={clearNotifications}
              disabled={clearingAll}
              title="Supprimer toutes les notifications"
            >
              {clearingAll ? "Effacement..." : "Tout effacer"}
            </button>
          )}
        </div>
      </div>
      {notifications.length === 0 ? (
        <p className="empty-state">Aucune notification</p>
      ) : (
        <div className="notif-list">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`notif-item ${notif.read ? "read" : "unread"}`}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              <div className="notif-content">
                <div className="notif-message">{notif.message}</div>
                <small className="notif-time">
                  {new Date(notif.createdAt).toLocaleDateString("fr-FR")}
                </small>
              </div>
              <button
                type="button"
                className="notif-delete-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteNotification(notif.id);
                }}
                disabled={deletingId === notif.id}
                title="Supprimer cette notification"
              >
                {deletingId === notif.id ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

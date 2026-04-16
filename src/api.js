const API_URL = "/api";

async function request(path, options = {}) {
  const token = sessionStorage.getItem("deepfocus-token");
  const hasJsonBody = options.body && !(options.body instanceof FormData);
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue");
  }
  return data;
}

export const api = {
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: () => request("/auth/me"),
  deleteAccount: () => request("/auth/delete", { method: "DELETE" }),
  joinWorkspace: (inviteCode) =>
    request("/workspace/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode })
    }),
  saveWorkspace: (workspace) =>
    request("/workspace", {
      method: "PUT",
      body: JSON.stringify({ workspace })
    }),
  uploadAttachment: (cardId, file) => {
    const body = new FormData();
    body.append("cardId", cardId);
    body.append("file", file);
    return request("/attachments", {
      method: "POST",
      body
    });
  },
  uploadTaskAttachment: (taskId, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/tasks/${taskId}/attachments`, {
      method: "POST",
      body
    });
  },

  // ──── Tâches ────
  createTask: (payload) =>
    request("/tasks/create", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateTask: (taskId, payload) =>
    request(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteTask: (taskId) =>
    request(`/tasks/${taskId}`, {
      method: "DELETE"
    }),
  get: (path, options = {}) => {
    const params = options.params ? new URLSearchParams(options.params) : null;
    const url = params ? `${path}?${params}` : path;
    return request(url);
  },

  // ──── Invitations ────
  sendInvitation: (payload) =>
    request("/invitations/send", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  acceptInvitation: (invitationId) =>
    request(`/invitations/${invitationId}/accept`, {
      method: "POST"
    }),
  removeMember: (memberId) =>
    request(`/workspace/members/${memberId}`, {
      method: "DELETE"
    }),

  // ──── Auth ────
  logout: () => {
    sessionStorage.removeItem("deepfocus-token");
  },

  // ──── Notifications ────
  getNotifications: () => request("/notifications"),
  markNotificationAsRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, {
      method: "PUT"
    }),
  clearNotifications: () =>
    request("/notifications", {
      method: "DELETE"
    }),
  deleteNotification: (notificationId) =>
    request(`/notifications/${notificationId}`, {
      method: "DELETE"
    })
};

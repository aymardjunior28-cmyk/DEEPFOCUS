const API_URL = "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("trello2-token");
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
  }
};

const DEFAULT_API_BASE_URL = "https://yordamai-production.up.railway.app/api"

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, "");

const CONVERSATIONS_API_URL =
  `${API_BASE_URL}/conversations`;

const getToken = () => {
  return localStorage.getItem("yordamai_token");
};

const createHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({
    message: "Serverdan noto‘g‘ri javob keldi",
  }));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Server xatosi: ${response.status}`
    );
  }

  return data;
};

export const getConversations = async () => {
  const response = await fetch(
    CONVERSATIONS_API_URL,
    {
      method: "GET",
      headers: createHeaders(),
    }
  );

  return parseResponse(response);
};

export const getConversationMessages = async (
  conversationId
) => {
  const response = await fetch(
    `${CONVERSATIONS_API_URL}/${conversationId}/messages`,
    {
      method: "GET",
      headers: createHeaders(),
    }
  );

  return parseResponse(response);
};

export const createConversation = async (data = {}) => {
  const response = await fetch(
    CONVERSATIONS_API_URL,
    {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify(data),
    }
  );

  return parseResponse(response);
};

export const deleteConversation = async (
  conversationId
) => {
  const response = await fetch(
    `${CONVERSATIONS_API_URL}/${conversationId}`,
    {
      method: "DELETE",
      headers: createHeaders(),
    }
  );

  return parseResponse(response);
};
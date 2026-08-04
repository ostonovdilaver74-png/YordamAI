const DEFAULT_API_BASE_URL = "http://localhost:5000/api";

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, "");

const AUTH_API_URL = `${API_BASE_URL}/auth`;

const parseResponse = async (res) => {
  const data = await res.json().catch(() => ({
    message: "Serverdan noto‘g‘ri javob keldi",
  }));

  if (!res.ok) {
    throw new Error(
      data.message || `Server xatosi: ${res.status}`
    );
  }

  return data;
};

export const registerUser = async (userData) => {
  const res = await fetch(`${AUTH_API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  return parseResponse(res);
};

export const loginUser = async (userData) => {
  const res = await fetch(`${AUTH_API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  return parseResponse(res);
};

export const getMe = async (token) => {
  const res = await fetch(`${AUTH_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(res);
};
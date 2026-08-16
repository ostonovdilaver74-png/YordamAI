const DEFAULT_API_BASE_URL =
  "https://yordamai-production.up.railway.app/api";

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    DEFAULT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, "");

const MEMORY_API_URL =
  `${API_BASE_URL}/memory`;

const TOKEN_STORAGE_KEY =
  "yordamai_token";

function getToken() {
  try {
    return localStorage.getItem(
      TOKEN_STORAGE_KEY
    );
  } catch {
    return null;
  }
}

function createHeaders() {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Sessiya topilmadi. Qayta tizimga kiring."
    );
  }

  return {
    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${token}`,
  };
}

async function parseResponse(response) {
  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Memory API xatosi"
    );
  }

  return data;
}

export async function getMemories() {
  const response =
    await fetch(
      MEMORY_API_URL,
      {
        method: "GET",
        headers:
          createHeaders(),
      }
    );

  return parseResponse(
    response
  );
}

export async function deleteMemory(
  memoryId
) {
  const response =
    await fetch(
      `${MEMORY_API_URL}/${memoryId}`,
      {
        method: "DELETE",
        headers:
          createHeaders(),
      }
    );

  return parseResponse(
    response
  );
}

export async function clearMemories() {
  const response =
    await fetch(
      MEMORY_API_URL,
      {
        method: "DELETE",
        headers:
          createHeaders(),
      }
    );

  return parseResponse(
    response
  );
}
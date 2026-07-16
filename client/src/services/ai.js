const API_URL = "http://localhost:5000/api/chat";

const getToken = () => localStorage.getItem("yordamai_token");

export async function askAI(
  message,
  conversationId = null,
  modelKey = "GEMINI"
) {
  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },

    body: JSON.stringify({
      message,
      conversationId,
      modelKey,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "AI javobida xato"
    );
  }

  return data;
}
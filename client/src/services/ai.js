const DEFAULT_API_BASE_URL = "http://localhost:5000/api";

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    DEFAULT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, "");

const CHAT_API_URL = `${API_BASE_URL}/chat`;
const CHAT_STREAM_API_URL = `${CHAT_API_URL}/stream`;

const TOKEN_STORAGE_KEY = "yordamai_token";

function getToken() {
  try {
    return localStorage.getItem(
      TOKEN_STORAGE_KEY
    );
  } catch (error) {
    console.error(
      "Tokenni localStorage ichidan olishda xatolik:",
      error
    );

    return null;
  }
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizeModelKey(modelKey) {
  const value = String(
    modelKey || "GEMINI"
  )
    .trim()
    .toUpperCase();

  const allowedModels = [
    "GPT",
    "CLAUDE",
    "GEMINI",
    "DEEPSEEK",
  ];

  return allowedModels.includes(value)
    ? value
    : "GEMINI";
}

function createRequestBody({
  message,
  conversationId = null,
  modelKey = "GEMINI",
  documentContext = "",
}) {
  const cleanMessage = normalizeText(message);

  if (!cleanMessage) {
    throw new Error(
      "AI uchun xabar yozilishi kerak"
    );
  }

  return {
    message: cleanMessage,

    conversationId:
      conversationId || null,

    modelKey:
      normalizeModelKey(modelKey),

    documentContext:
      typeof documentContext === "string"
        ? documentContext
        : "",
  };
}

function createRequestHeaders() {
  const token = getToken();

  if (!token) {
    const error = new Error(
      "Sessiya topilmadi. Qayta tizimga kiring."
    );

    error.code = "AUTH_TOKEN_MISSING";
    error.status = 401;

    throw error;
  }

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonSafely(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    !contentType.includes("application/json")
  ) {
    const text = await response.text();

    return {
      success: response.ok,
      error:
        normalizeText(text) ||
        "Server noto‘g‘ri javob qaytardi",
    };
  }

  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error:
        "Server javobini o‘qishda xatolik yuz berdi",
    };
  }
}

function createApiError({
  message,
  code,
  status,
  data,
}) {
  const error = new Error(
    message || "AI javobida xatolik"
  );

  error.code =
    code || "AI_REQUEST_FAILED";

  error.status =
    Number(status) || 500;

  error.data = data || null;

  return error;
}

function getErrorMessage(data, fallback) {
  return (
    data?.error ||
    data?.message ||
    fallback ||
    "AI javobida xatolik"
  );
}

/* =========================================================
   ODDIY JSON CHAT
========================================================= */

export async function askAI(
  message,
  conversationId = null,
  modelKey = "GEMINI",
  documentContext = "",
  options = {}
) {
  const {
    signal,
  } = options;

  const requestBody = createRequestBody({
    message,
    conversationId,
    modelKey,
    documentContext,
  });

  let response;

  try {
    response = await fetch(CHAT_API_URL, {
      method: "POST",

      headers: createRequestHeaders(),

      body: JSON.stringify(requestBody),

      signal,
    });
  } catch (error) {
    if (
      error?.name === "AbortError"
    ) {
      throw createApiError({
        message:
          "AI javobini yaratish to‘xtatildi",
        code: "AI_REQUEST_ABORTED",
        status: 499,
      });
    }

    throw createApiError({
      message:
        "Server bilan bog‘lanib bo‘lmadi. Backend ishlayotganini tekshiring.",
      code: "NETWORK_ERROR",
      status: 503,
      data: error,
    });
  }

  const data = await parseJsonSafely(
    response
  );

  if (!response.ok) {
    throw createApiError({
      message: getErrorMessage(
        data,
        "AI javobida xatolik"
      ),

      code:
        data?.code ||
        "AI_REQUEST_FAILED",

      status: response.status,

      data,
    });
  }

  return data;
}

/* =========================================================
   SSE PARSER
========================================================= */

function parseSseBlock(block) {
  const lines = block.split(/\r?\n/);

  let eventName = "message";
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventName = line
        .slice("event:".length)
        .trim();

      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(
        line.slice("data:".length).trimStart()
      );
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const rawData = dataLines.join("\n");

  let data;

  try {
    data = JSON.parse(rawData);
  } catch {
    data = {
      raw: rawData,
    };
  }

  return {
    event: eventName,
    data,
  };
}

/* =========================================================
   STREAMING CHAT
========================================================= */

export async function askAIStream(
  message,
  conversationId = null,
  modelKey = "GEMINI",
  documentContext = "",
  options = {}
) {
  const {
    signal,
    onStart,
    onModel,
    onToken,
    onComplete,
    onError,
  } = options;

  const requestBody = createRequestBody({
    message,
    conversationId,
    modelKey,
    documentContext,
  });

  let response;

  try {
    response = await fetch(
      CHAT_STREAM_API_URL,
      {
        method: "POST",

        headers: {
          ...createRequestHeaders(),
          Accept: "text/event-stream",
        },

        body: JSON.stringify(requestBody),

        signal,
      }
    );
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? createApiError({
            message:
              "AI javobini yaratish to‘xtatildi",
            code: "AI_REQUEST_ABORTED",
            status: 499,
          })
        : createApiError({
            message:
              "Streaming server bilan bog‘lanib bo‘lmadi.",
            code: "STREAM_NETWORK_ERROR",
            status: 503,
            data: error,
          });

    if (typeof onError === "function") {
      await onError(normalizedError);
    }

    throw normalizedError;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (
    !response.ok ||
    !contentType.includes(
      "text/event-stream"
    )
  ) {
    const data = await parseJsonSafely(
      response
    );

    const error = createApiError({
      message: getErrorMessage(
        data,
        "Streaming so‘rovida xatolik"
      ),

      code:
        data?.code ||
        "STREAM_REQUEST_FAILED",

      status: response.status,

      data,
    });

    if (typeof onError === "function") {
      await onError(error);
    }

    throw error;
  }

  if (!response.body) {
    const error = createApiError({
      message:
        "Brauzer streaming javobini o‘qiy olmadi",
      code: "STREAM_BODY_MISSING",
      status: 500,
    });

    if (typeof onError === "function") {
      await onError(error);
    }

    throw error;
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder("utf-8");

  let buffer = "";
  let fullReply = "";
  let startData = null;
  let modelData = null;
  let completeData = null;

  try {
    while (true) {
      const {
        value,
        done,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const blocks = buffer.split(
        /\r?\n\r?\n/
      );

      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const parsedEvent =
          parseSseBlock(block);

        if (!parsedEvent) {
          continue;
        }

        const {
          event,
          data,
        } = parsedEvent;

        if (event === "start") {
          startData = data;

          if (
            typeof onStart === "function"
          ) {
            await onStart(data);
          }

          continue;
        }

        if (event === "model") {
          modelData = data;

          if (
            typeof onModel === "function"
          ) {
            await onModel(data);
          }

          continue;
        }

        if (event === "token") {
          const token =
            typeof data?.token === "string"
              ? data.token
              : "";

          if (!token) {
            continue;
          }

          fullReply += token;

          if (
            typeof onToken === "function"
          ) {
            await onToken(token, {
              fullReply,
              start: startData,
              model: modelData,
            });
          }

          continue;
        }

        if (event === "complete") {
          completeData = data;

          if (
            typeof data?.reply === "string"
          ) {
            fullReply = data.reply;
          }

          if (
            typeof onComplete ===
            "function"
          ) {
            await onComplete(data, {
              fullReply,
              start: startData,
              model: modelData,
            });
          }

          continue;
        }

        if (event === "error") {
          const error =
            createApiError({
              message: getErrorMessage(
                data,
                "Streaming javobida xatolik"
              ),

              code:
                data?.code ||
                "STREAM_RESPONSE_ERROR",

              status:
                data?.status || 500,

              data,
            });

          if (
            typeof onError === "function"
          ) {
            await onError(error, {
              partialReply:
                data?.partialReply ||
                fullReply,
            });
          }

          throw error;
        }
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      const parsedEvent =
        parseSseBlock(buffer);

      if (
        parsedEvent?.event ===
          "complete" &&
        !completeData
      ) {
        completeData =
          parsedEvent.data;

        if (
          typeof completeData?.reply ===
          "string"
        ) {
          fullReply =
            completeData.reply;
        }

        if (
          typeof onComplete === "function"
        ) {
          await onComplete(
            completeData,
            {
              fullReply,
              start: startData,
              model: modelData,
            }
          );
        }
      }
    }

    if (!completeData) {
      if (signal?.aborted) {
        throw createApiError({
          message:
            "AI javobini yaratish to‘xtatildi",
          code: "AI_REQUEST_ABORTED",
          status: 499,
          data: {
            partialReply: fullReply,
          },
        });
      }

      throw createApiError({
        message:
          "Streaming javobi to‘liq yakunlanmadi",
        code: "STREAM_INCOMPLETE",
        status: 502,
        data: {
          partialReply: fullReply,
        },
      });
    }

    return {
      ...completeData,

      reply:
        completeData.reply ||
        fullReply,

      streamedReply: fullReply,

      start: startData,

      modelEvent: modelData,
    };
  } catch (error) {
    let normalizedError = error;

    if (
      error?.name === "AbortError" ||
      signal?.aborted
    ) {
      normalizedError =
        createApiError({
          message:
            "AI javobini yaratish to‘xtatildi",
          code: "AI_REQUEST_ABORTED",
          status: 499,
          data: {
            partialReply: fullReply,
          },
        });
    }

    if (
      typeof onError === "function" &&
      normalizedError?.code !==
        "STREAM_RESPONSE_ERROR"
    ) {
      await onError(normalizedError, {
        partialReply: fullReply,
      });
    }

    throw normalizedError;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader allaqachon yopilgan bo‘lishi mumkin.
    }
  }
}

/* =========================================================
   ABORT CONTROLLER
========================================================= */

export function createAIAbortController() {
  return new AbortController();
}

/* =========================================================
   API MA’LUMOTLARI
========================================================= */

export function getAIEndpoints() {
  return {
    baseUrl: API_BASE_URL,
    chatUrl: CHAT_API_URL,
    streamUrl: CHAT_STREAM_API_URL,
  };
}
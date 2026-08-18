const {
  getOpenRouterClient,
} = require("./openaiService");

const EMBEDDING_MODEL =
  String(
    process.env.RAG_EMBEDDING_MODEL ||
      "openai/text-embedding-3-small"
  )
    .trim();

const MAX_EMBEDDING_INPUT_LENGTH =
  Number(
    process.env.RAG_EMBEDDING_MAX_INPUT_LENGTH
  ) || 24_000;

const MAX_EMBEDDING_BATCH_SIZE =
  Math.min(
    Math.max(
      Number(
        process.env.RAG_EMBEDDING_BATCH_SIZE
      ) || 32,
      1
    ),
    100
  );

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(
  value,
  maxLength =
    MAX_EMBEDDING_INPUT_LENGTH
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(
      0,
      maxLength
    );
}

function normalizeEmbedding(
  value
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map(
      (item) =>
        Number(item)
    )
    .filter(
      (item) =>
        Number.isFinite(item)
    );
}

function assertEmbedding(
  embedding
) {
  if (
    !Array.isArray(
      embedding
    ) ||
    embedding.length === 0
  ) {
    const error =
      new Error(
        "Embedding modeli bo‘sh vector qaytardi"
      );

    error.statusCode = 502;
    error.code =
      "EMPTY_EMBEDDING";

    throw error;
  }

  return embedding;
}

/* =========================================================
   BITTA TEXT EMBEDDING
========================================================= */

async function createEmbedding(
  text,
  options = {}
) {
  const cleanText =
    normalizeText(
      text
    );

  if (!cleanText) {
    const error =
      new Error(
        "Embedding uchun matn bo‘sh"
      );

    error.statusCode = 400;
    error.code =
      "EMBEDDING_TEXT_REQUIRED";

    throw error;
  }

  const openRouter =
    getOpenRouterClient();

  const response =
    await openRouter.embeddings.create(
      {
        model:
          options.model ||
          EMBEDDING_MODEL,

        input:
          cleanText,

        encoding_format:
          "float",
      },
      {
        signal:
          options.signal,
      }
    );

  const embedding =
    normalizeEmbedding(
      response?.data?.[0]
        ?.embedding
    );

  return assertEmbedding(
    embedding
  );
}

/* =========================================================
   BATCH EMBEDDING
========================================================= */

async function createEmbeddings(
  texts = [],
  options = {}
) {
  if (
    !Array.isArray(texts)
  ) {
    return [];
  }

  const cleanTexts =
    texts
      .map(
        (text) =>
          normalizeText(
            text
          )
      )
      .filter(Boolean);

  if (
    cleanTexts.length === 0
  ) {
    return [];
  }

  const results = [];

  for (
    let index = 0;
    index <
    cleanTexts.length;
    index +=
      MAX_EMBEDDING_BATCH_SIZE
  ) {
    const batch =
      cleanTexts.slice(
        index,
        index +
          MAX_EMBEDDING_BATCH_SIZE
      );

    const openRouter =
      getOpenRouterClient();

    const response =
      await openRouter.embeddings.create(
        {
          model:
            options.model ||
            EMBEDDING_MODEL,

          input:
            batch,

          encoding_format:
            "float",
        },
        {
          signal:
            options.signal,
        }
      );

    const data =
      Array.isArray(
        response?.data
      )
        ? response.data
        : [];

    /*
     * Provider data indekslarini qaytarsa,
     * original batch tartibini saqlaymiz.
     */
    const ordered =
      data
        .map(
          (
            item,
            fallbackIndex
          ) => ({
            index:
              Number.isInteger(
                item?.index
              )
                ? item.index
                : fallbackIndex,

            embedding:
              normalizeEmbedding(
                item?.embedding
              ),
          })
        )
        .sort(
          (a, b) =>
            a.index -
            b.index
        );

    if (
      ordered.length !==
      batch.length
    ) {
      const error =
        new Error(
          "Embedding batch javobi to‘liq emas"
        );

      error.statusCode = 502;
      error.code =
        "EMBEDDING_BATCH_INCOMPLETE";

      throw error;
    }

    for (
      const item of
      ordered
    ) {
      results.push(
        assertEmbedding(
          item.embedding
        )
      );
    }
  }

  return results;
}

/* =========================================================
   COSINE SIMILARITY
========================================================= */

function cosineSimilarity(
  first = [],
  second = []
) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length === 0 ||
    second.length === 0 ||
    first.length !==
      second.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (
    let index = 0;
    index <
    first.length;
    index += 1
  ) {
    const a =
      Number(
        first[index]
      );

    const b =
      Number(
        second[index]
      );

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {
      return 0;
    }

    dotProduct +=
      a * b;

    firstMagnitude +=
      a * a;

    secondMagnitude +=
      b * b;
  }

  if (
    firstMagnitude === 0 ||
    secondMagnitude === 0
  ) {
    return 0;
  }

  return (
    dotProduct /
    (
      Math.sqrt(
        firstMagnitude
      ) *
      Math.sqrt(
        secondMagnitude
      )
    )
  );
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createEmbedding,
  createEmbeddings,
  cosineSimilarity,

  normalizeEmbedding,

  EMBEDDING_MODEL,
};

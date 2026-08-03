import {
  memo,
  useMemo,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "../../styles/MessageBubble.scss";

/* =========================================================
   VAQTNI FORMATLASH
========================================================= */

function formatTime(message) {
  if (message.time) {
    return message.time;
  }

  const value =
    message.createdAt ||
    message.updatedAt ||
    message.timestamp;

  if (!value) {
    return "";
  }

  try {
    return new Date(
      value
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

/* =========================================================
   URL TEKSHIRISH
========================================================= */

function normalizeUrl(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  const cleanUrl =
    value.trim();

  if (
    !cleanUrl.startsWith(
      "https://"
    ) &&
    !cleanUrl.startsWith(
      "http://"
    )
  ) {
    return "";
  }

  return cleanUrl;
}

/* =========================================================
   DOMAIN NOMINI OLISH
========================================================= */

function getSourceDomain(url) {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return "Manba";
  }
}

/* =========================================================
   MANBALARNI NORMALIZATSIYA QILISH
========================================================= */

function normalizeSources(
  sources = []
) {
  if (!Array.isArray(sources)) {
    return [];
  }

  const uniqueSources =
    new Map();

  for (
    const source of sources
  ) {
    if (
      !source ||
      typeof source !== "object"
    ) {
      continue;
    }

    const url =
      normalizeUrl(
        source.url ||
          source.link ||
          source.href
      );

    if (!url) {
      continue;
    }

    const title =
      typeof source.title ===
        "string" &&
      source.title.trim()
        ? source.title.trim()
        : getSourceDomain(url);

    const content =
      typeof source.content ===
        "string"
        ? source.content.trim()
        : "";

    if (
      !uniqueSources.has(url)
    ) {
      uniqueSources.set(
        url,
        {
          url,
          title,
          content,
          domain:
            getSourceDomain(url),
        }
      );
    }
  }

  return [
    ...uniqueSources.values(),
  ];
}

/* =========================================================
   CODE BLOCK
========================================================= */

function CodeBlock({
  inline,
  className,
  children,
}) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const code = String(
    children
  ).replace(/\n$/, "");

  async function copyCode() {
    try {
      await navigator.clipboard
        .writeText(code);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Kodni nusxalashda xatolik:",
        error
      );
    }
  }

  if (inline) {
    return (
      <code
        className={className}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="message-code-wrapper">
      <div className="message-code-header">
        <span>
          {className
            ?.replace(
              "language-",
              ""
            )
            .toUpperCase() ||
            "CODE"}
        </span>

        <button
          type="button"
          onClick={copyCode}
        >
          {copied
            ? "✅ Nusxalandi"
            : "📋 Nusxalash"}
        </button>
      </div>

      <pre>
        <code
          className={
            className
          }
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

/* =========================================================
   SOURCES
========================================================= */

function MessageSources({
  sources,
  isStreaming,
}) {
  const normalizedSources =
    useMemo(
      () =>
        normalizeSources(
          sources
        ),
      [sources]
    );

  if (
    normalizedSources.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="message-sources">
      <div className="message-sources-header">
        <div className="message-sources-title">
          <span
            aria-hidden="true"
          >
            🌐
          </span>

          <span>
            Manbalar
          </span>
        </div>

        <span className="message-sources-count">
          {
            normalizedSources.length
          }
        </span>
      </div>

      <div className="message-sources-list">
        {normalizedSources.map(
          (
            source,
            index
          ) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="message-source-card"
              title={
                source.title
              }
            >
              <div className="message-source-index">
                {index + 1}
              </div>

              <div className="message-source-content">
                <p className="message-source-title">
                  {source.title}
                </p>

                <p className="message-source-domain">
                  {source.domain}
                </p>

                {source.content && (
                  <p className="message-source-description">
                    {
                      source.content
                    }
                  </p>
                )}
              </div>

              <span
                className="message-source-arrow"
                aria-hidden="true"
              >
                ↗
              </span>
            </a>
          )
        )}
      </div>

      {isStreaming && (
        <p className="message-sources-streaming">
          Manbalar
          yangilanmoqda...
        </p>
      )}
    </div>
  );
}

/* =========================================================
   MESSAGE BUBBLE
========================================================= */

function MessageBubble({
  message,
  isFirstInGroup,
}) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const isUser =
    message.role === "user";

  const model =
    message.model ||
    message.modelKey ||
    "";

  const time = useMemo(
    () =>
      formatTime(message),
    [message]
  );

  const sources = useMemo(
    () =>
      Array.isArray(
        message.sources
      )
        ? message.sources
        : [],
    [message.sources]
  );

  const hasSources =
    sources.length > 0;

  const webSearchUsed =
    Boolean(
      message.webSearchUsed ||
        hasSources
    );

  async function copyMessage() {
    try {
      await navigator.clipboard
        .writeText(
          message.content || ""
        );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Xabarni nusxalashda xatolik:",
        error
      );
    }
  }

  return (
    <div
      className={`message-row ${
        isUser
          ? "message-row-user"
          : "message-row-ai"
      }`}
    >
      {!isUser &&
        isFirstInGroup && (
          <div className="message-avatar message-avatar-ai">
            🤖
          </div>
        )}

      {!isUser &&
        !isFirstInGroup && (
          <div className="message-avatar-empty" />
        )}

      <div className="message-content">
        {!isUser &&
          (model ||
            webSearchUsed) && (
            <div className="message-meta">
              {model && (
                <div className="message-model">
                  {model}
                </div>
              )}

              {webSearchUsed && (
                <div className="message-web-badge">
                  <span
                    aria-hidden="true"
                  >
                    🌐
                  </span>

                  Internet
                </div>
              )}
            </div>
          )}

        <div
          className={`message-bubble ${
            isUser
              ? "message-bubble-user"
              : "message-bubble-ai"
          } ${
            message.isTemporary
              ? "message-bubble-temp"
              : ""
          } ${
            message.isStreaming
              ? "message-bubble-streaming"
              : ""
          }`}
        >
          {isUser ? (
            <p className="message-user-text">
              {message.content}
            </p>
          ) : (
            <div className="message-markdown">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                ]}
                components={{
                  code:
                    CodeBlock,

                  a({
                    href,
                    children,
                  }) {
                    const safeUrl =
                      normalizeUrl(
                        href
                      );

                    if (!safeUrl) {
                      return (
                        <span>
                          {
                            children
                          }
                        </span>
                      );
                    }

                    return (
                      <a
                        href={
                          safeUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {
                          children
                        }
                      </a>
                    );
                  },
                }}
              >
                {message.content ||
                  ""}
              </ReactMarkdown>
            </div>
          )}

          {time && (
            <div className="message-time">
              {time}
            </div>
          )}
        </div>

        {!isUser &&
          hasSources && (
            <MessageSources
              sources={sources}
              isStreaming={
                Boolean(
                  message.isStreaming
                )
              }
            />
          )}

        {!isUser && (
          <div className="message-actions">
            <button
              onClick={
                copyMessage
              }
              type="button"
              className="message-copy-button"
            >
              {copied
                ? "✅ Nusxalandi"
                : "📋 Nusxalash"}
            </button>
          </div>
        )}
      </div>

      {isUser &&
        isFirstInGroup && (
          <div className="message-avatar message-avatar-user">
            👤
          </div>
        )}

      {isUser &&
        !isFirstInGroup && (
          <div className="message-avatar-empty" />
        )}
    </div>
  );
}

export default memo(
  MessageBubble
);
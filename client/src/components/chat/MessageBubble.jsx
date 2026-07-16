import { memo, useMemo, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "../../styles/MessageBubble.scss";

function formatTime(message) {
  if (message.time) return message.time;

  const value =
    message.createdAt ||
    message.updatedAt ||
    message.timestamp;

  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function CodeBlock({
  inline,
  className,
  children,
}) {
  const [copied, setCopied] = useState(false);

  const code = String(children).replace(/\n$/, "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {}
  }

  if (inline) {
    return (
      <code className={className}>
        {children}
      </code>
    );
  }

  return (
    <div className="message-code-wrapper">
      <div className="message-code-header">
        <span>
          {className
            ?.replace("language-", "")
            .toUpperCase() || "CODE"}
        </span>

        <button
          type="button"
          onClick={copyCode}
        >
          {copied
            ? "✅ Copied"
            : "📋 Copy"}
        </button>
      </div>

      <pre>
        <code className={className}>
          {code}
        </code>
      </pre>
    </div>
  );
}

function MessageBubble({
  message,
  isFirstInGroup,
}) {
  const [copied, setCopied] = useState(false);

  const isUser =
    message.role === "user";

  const model =
    message.model ||
    message.modelKey ||
    "";

  const time = useMemo(
    () => formatTime(message),
    [message]
  );

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(
        message.content || ""
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (e) {
      console.error(e);
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
      {!isUser && isFirstInGroup && (
        <div className="message-avatar message-avatar-ai">
          🤖
        </div>
      )}

      {!isUser && !isFirstInGroup && (
        <div className="message-avatar-empty" />
      )}

      <div className="message-content">
        {!isUser &&
          model && (
            <div className="message-model">
              {model}
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
                  code: CodeBlock,
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
            </div>
          )}

          {time && (
            <div className="message-time">
              {time}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="message-actions">
            <button
              onClick={copyMessage}
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

export default memo(MessageBubble);
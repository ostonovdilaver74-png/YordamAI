import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "../../styles/MessageBubble.scss";

function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        message.content || ""
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (error) {
      console.error("Nusxalashda xatolik:", error);
    }
  }

  return (
    <div
      className={`message-row ${
        isUser ? "message-row-user" : "message-row-ai"
      }`}
    >
      {!isUser && (
        <div className="message-avatar message-avatar-ai">
          🤖
        </div>
      )}

      <div className="message-content">
        <div
          className={`message-bubble ${
            isUser
              ? "message-bubble-user"
              : "message-bubble-ai"
          }`}
        >
          {isUser ? (
            <p className="message-user-text">
              {message.content}
            </p>
          ) : (
            <div className="message-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {message.time && (
            <span className="message-time">
              {message.time}
            </span>
          )}
        </div>

        {!isUser && (
          <div className="message-actions">
            <button
              type="button"
              onClick={handleCopy}
              className="message-copy-button"
              title="Javobni nusxalash"
            >
              {copied ? "✅ Nusxalandi" : "📋 Nusxalash"}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="message-avatar message-avatar-user">
          👤
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
import { memo, useMemo } from "react";

import MessageBubble from "./MessageBubble";

import "../../styles/MessageList.scss";

function createMessageKey(message, index) {
  return (
    message?._id ||
    message?.id ||
    `${message?.role || "message"}-${message?.createdAt || index}`
  );
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.filter((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    const content =
      typeof message.content === "string"
        ? message.content.trim()
        : "";

    return Boolean(
      content ||
        message.isTemporary ||
        message.isLoading ||
        message.error
    );
  });
}

function MessageList({ messages = [] }) {
  const safeMessages = useMemo(
    () => normalizeMessages(messages),
    [messages]
  );

  if (safeMessages.length === 0) {
    return null;
  }

  return (
    <div
      className="message-list"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Chat xabarlari"
    >
      <div className="message-list__inner">
        {safeMessages.map((message, index) => {
          const previousMessage =
            index > 0 ? safeMessages[index - 1] : null;

          const nextMessage =
            index < safeMessages.length - 1
              ? safeMessages[index + 1]
              : null;

          const isFirstInGroup =
            !previousMessage ||
            previousMessage.role !== message.role;

          const isLastInGroup =
            !nextMessage ||
            nextMessage.role !== message.role;

          return (
            <div
              key={createMessageKey(message, index)}
              className={[
                "message-list__item",
                `message-list__item--${
                  message.role === "user"
                    ? "user"
                    : "assistant"
                }`,
                isFirstInGroup
                  ? "message-list__item--first"
                  : "",
                isLastInGroup
                  ? "message-list__item--last"
                  : "",
                message.isTemporary
                  ? "message-list__item--temporary"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-message-role={
                message.role || "assistant"
              }
            >
              <MessageBubble
                message={message}
                index={index}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(MessageList);
import { useRef, useState } from "react";
import "../../styles/ChatInput.scss";

function ChatInput({ onSend, isLoading = false }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  function resizeTextarea() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  function handleChange(event) {
    setMessage(event.target.value);
    resizeTextarea();
  }

  function resetTextarea() {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "40px";
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || isLoading) {
      return;
    }

    onSend(cleanMessage);
    setMessage("");

    requestAnimationFrame(resetTextarea);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  return (
    <form
      className="chat-engine-input-form"
      onSubmit={handleSubmit}
    >
      <div className="chat-engine-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-engine-textarea"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="YordamAI ga xabar yozing..."
          rows={1}
          disabled={isLoading}
        />

        <button
          className="chat-engine-send-button"
          type="submit"
          disabled={!message.trim() || isLoading}
          aria-label="Xabar yuborish"
        >
          {isLoading ? (
            <span className="chat-engine-spinner" />
          ) : (
            "➤"
          )}
        </button>
      </div>

      <p className="chat-engine-hint">
        Enter — yuborish, Shift + Enter — yangi qator
      </p>
    </form>
  );
}

export default ChatInput;
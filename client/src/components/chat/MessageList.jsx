import MessageBubble from "./MessageBubble";
import "../../styles/MessageList.scss";

function MessageList({ messages = [] }) {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <MessageBubble
          key={message._id || message.id || index}
          message={message}
        />
      ))}
    </div>
  );
}

export default MessageList;
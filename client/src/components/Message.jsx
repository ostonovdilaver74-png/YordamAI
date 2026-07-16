import ReactMarkdown from "react-markdown";

export default function Message({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-3xl rounded-2xl p-5 shadow ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-800"
        }`}
      >
        {!isUser && (
          <div className="font-bold text-blue-600 mb-3">
            🤖 YordamAI
          </div>
        )}

        <div className="prose max-w-none">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
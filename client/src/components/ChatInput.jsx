import Input from "./ui/Input";
import Button from "./ui/Button";

export default function ChatInput({
  input,
  setInput,
  sendMessage,
}) {
  return (
    <div className="border-t bg-white p-5">
      <div className="flex gap-3">

        <Input
          placeholder="Savolingizni yozing..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <Button onClick={sendMessage}>
          Yuborish
        </Button>

      </div>
    </div>
  );
}
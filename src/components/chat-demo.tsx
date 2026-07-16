import type { ChatMessage } from "@/lib/ai-solutions-data";

export function ChatDemo({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex flex-col gap-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-background px-4 py-2 text-foreground"
            }
          >
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}

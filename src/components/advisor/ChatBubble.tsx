import type { ChatMessage } from "@/lib/ai/valbriSquadAdvisorSchema";

type Props = { message: ChatMessage };

export function ChatBubble({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[80%]">
        <div className="mb-1 mr-2 text-right text-[10px] font-medium text-valmuted">You</div>
        <div className="rounded-3xl rounded-br-md bg-valaccent px-4 py-3 text-sm font-medium text-valbg whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="mr-auto max-w-[80%]">
      <div className="mb-1 ml-2 text-[10px] font-medium text-valmuted">Valai</div>
      <div className="rounded-3xl rounded-bl-md bg-valelev border border-white/[0.06] px-4 py-3 text-sm text-valtext leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

import type { MessageDTO } from "@/server/actions/chat.actions";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message }: { message: MessageDTO }) {
  const isMine = message.isMine;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isMine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-foreground/10 bg-white"
        }`}
      >
        {message.type === "TEXT" && message.text && (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}

        {message.attachment && (
          <div className="mt-1">
            {message.attachment.mimeType.startsWith("image/") ? (
              <a href={message.attachment.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.attachment.url}
                  alt={message.attachment.fileName}
                  className="max-h-48 rounded-lg object-cover"
                />
              </a>
            ) : message.attachment.mimeType.startsWith("video/") ? (
              <video
                src={message.attachment.url}
                controls
                className="max-h-48 rounded-lg"
              />
            ) : (
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 underline ${
                  isMine ? "text-primary-foreground" : "text-primary"
                }`}
              >
                📎 {message.attachment.fileName}
              </a>
            )}
          </div>
        )}

        {message.text && message.attachment && (
          <p className="mt-2 whitespace-pre-wrap break-words">{message.text}</p>
        )}

        <span
          className={`mt-1 block text-right text-[10px] ${
            isMine ? "text-primary-foreground/70" : "text-foreground/40"
          }`}
        >
          {fmtTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

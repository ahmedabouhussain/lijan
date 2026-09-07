import React from "react";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";

const ACTIVE_STATUSES = ["pending", "running", "in_progress"];

const mdComponents = {
  table: ({ children }) => <table className="w-full text-xs my-2 border-collapse rounded-md overflow-hidden">{children}</table>,
  thead: ({ children }) => <thead className="bg-secondary/60">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/40 last:border-0">{children}</tr>,
  th: ({ children }) => <th className="px-2 py-1.5 text-right font-semibold text-muted-foreground whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,
};

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const activeTools = (message.tool_calls || []).filter((tc) => ACTIVE_STATUSES.includes(tc.status));

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
        {message.content && (
          isUser
            ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            : <ReactMarkdown
                className="text-sm prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                components={mdComponents}
              >{message.content}</ReactMarkdown>
        )}
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>جارٍ البحث في النظام…</span>
          </div>
        )}
      </div>
    </div>
  );
}
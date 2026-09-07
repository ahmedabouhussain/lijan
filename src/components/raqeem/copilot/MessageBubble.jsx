import React from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Bot } from "lucide-react";

const ACTIVE_STATUSES = ["pending", "running", "in_progress"];

const mdComponents = {
  table: ({ children }) => <table className="w-full text-xs my-3 border-collapse rounded-lg overflow-hidden border border-border shadow-sm">{children}</table>,
  thead: ({ children }) => <thead className="bg-primary/10 border-b-2 border-primary/20">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/40 last:border-0 even:bg-secondary/30">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-right font-semibold text-foreground/70 whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top leading-relaxed">{children}</td>,
};

export default function MessageBubble({ message, agentIcon: AgentIcon = Bot }) {
  const isUser = message.role === "user";
  const activeTools = (message.tool_calls || []).filter((tc) => ACTIVE_STATUSES.includes(tc.status));

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2.5 bg-primary text-primary-foreground shadow-sm">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-primary/15">
        <AgentIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tl-md px-3.5 py-2.5 bg-card border border-border shadow-sm">
        {message.content && (
          <ReactMarkdown
            className="text-sm prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 leading-relaxed"
            components={mdComponents}
          >{message.content}</ReactMarkdown>
        )}
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>جارٍ البحث في النظام…</span>
          </div>
        )}
      </div>
    </div>
  );
}
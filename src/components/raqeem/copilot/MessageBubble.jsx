import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import AmeenEmblem from "@/components/ameen/AmeenEmblem";
import { useLanguage } from "@/lib/LanguageContext";
import { hasArabicScript } from "@/lib/l10n";

const ACTIVE_STATUSES = ["pending", "running", "in_progress"];

const mdComponents = {
  table: ({ children }) => (
    <div className="w-full overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse border border-border">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary/5 border-b-2 border-primary/20">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/40 last:border-0 even:bg-secondary/30">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-start font-semibold text-foreground/70 whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top leading-relaxed">{children}</td>,
};

export default function MessageBubble({ message }) {
  const { t } = useLanguage();
  const isUser = message.role === "user";
  const activeTools = (message.tool_calls || []).filter((tc) => ACTIVE_STATUSES.includes(tc.status));

  // One language per bubble: the direction follows the language the text is ACTUALLY in,
  // so an English reply inside an English interface is always LTR with left-aligned text,
  // never RTL because the thread once held Arabic.
  const replyIsArabic = !isUser && hasArabicScript(message.content);
  const bubbleDir = replyIsArabic ? "rtl" : "ltr";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          dir="auto"
          className="max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2.5 bg-primary text-primary-foreground shadow-sm"
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <div className="shrink-0 mt-0.5">
        <AmeenEmblem size={30} tone="outline" />
      </div>
      <div
        dir={bubbleDir}
        className="max-w-[85%] rounded-2xl rounded-tl-md px-3.5 py-2.5 bg-card border border-border shadow-sm text-start"
      >
        {message.content && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="text-sm prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 leading-relaxed"
            components={mdComponents}
          >{message.content}</ReactMarkdown>
        )}
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t("جارٍ التحقق من السجلات…", "Checking the records…")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
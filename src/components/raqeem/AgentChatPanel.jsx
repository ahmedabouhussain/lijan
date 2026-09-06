import React, { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import MessageBubble from "./copilot/MessageBubble";
import { cn } from "@/lib/utils";

/**
 * AgentChatPanel — unified agent chat panel.
 * variant="floating" → fixed bottom-corner button + slide-out sheet.
 * variant="inline" → inline button + slide-out sheet (for existing page integrations).
 */
export default function AgentChatPanel({
  agentKey,
  icon: Icon,
  title,
  triggerLabel,
  emptyHint,
  metadata = {},
  variant = "inline",
  buttonClassName,
}) {
  const { isDemoMode } = useEffectiveActor();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Build a stable metadata key for finding/creating the conversation
  const metadataKey = JSON.stringify(metadata);

  useEffect(() => {
    if (!open || conversation || isDemoMode) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.agents.listConversations({ agent_name: agentKey });
        const meta = JSON.parse(metadataKey);
        // Find existing conversation matching all metadata pairs
        const existing = (list || []).find((c) => {
          if (!c.metadata) return false;
          return Object.entries(meta).every(([k, v]) => c.metadata[k] === v);
        });
        const conv = existing || await base44.agents.createConversation({
          agent_name: agentKey,
          metadata: { name: title, ...meta },
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {}
      setLoading(false);
    })();
  }, [open, conversation, agentKey, metadataKey, isDemoMode, title]);

  useEffect(() => {
    if (!conversation) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => setMessages(data.messages || []));
    return unsub;
  }, [conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } catch {}
    setSending(false);
  };

  const trigger = (children) => (
    <Sheet open={open} onOpenChange={setOpen}>
      {children}
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Icon className="w-4 h-4 text-accent" />
            {title}
          </SheetTitle>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20" dir="rtl">
          {isDemoMode ? (
            <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
              <Icon className="w-8 h-8 text-accent/40 mx-auto" />
              <p>المساعد الذكي متاح للمستخدمين المسجّلين.</p>
              <p className="text-xs">سجّل الدخول لاستخدام المساعد في هذه الصفحة.</p>
            </div>
          ) : loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">جارٍ التحميل…</p>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 space-y-1">
              <p>{triggerLabel}</p>
              {emptyHint && <p className="text-xs">{emptyHint}</p>}
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
        </div>
        {!isDemoMode && (
          <div className="p-3 border-t border-border flex gap-2" dir="rtl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="اكتب رسالتك…"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
            />
            <Button size="icon" onClick={send} disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );

  if (variant === "floating") {
    return trigger(
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-dark transition-all hover:scale-105 group",
          buttonClassName
        )}
        title={triggerLabel}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-300">
          {triggerLabel}
        </span>
      </button>
    );
  }

  // Inline variant — button trigger (for existing page integrations)
  return trigger(
    <Button size="sm" variant="outline" className={buttonClassName} onClick={() => setOpen(true)}>
      <Icon className="w-3.5 h-3.5" />
      {triggerLabel}
    </Button>
  );
}
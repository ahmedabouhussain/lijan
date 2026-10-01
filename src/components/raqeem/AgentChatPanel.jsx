import React, { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import MessageBubble from "./copilot/MessageBubble";
import { cn } from "@/lib/utils";
import { AMEEN_AGENT_NAME, AMEEN_DISPLAY_NAME, AmeenIcon, getAmeenMode } from "@/lib/ameenAgent";

/**
 * AgentChatPanel — the single «أمين» chat surface.
 * One agent and one identity; `mode` selects the active context (state) it runs in.
 * variant="floating" → fixed bottom-corner button + slide-out sheet.
 * variant="inline" → inline button + slide-out sheet.
 */
export default function AgentChatPanel({
  mode = "general",
  metadata = {},
  variant = "inline",
  buttonClassName,
}) {
  const config = getAmeenMode(mode);
  const { isDemoMode } = useEffectiveActor();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // A stable key identifying this context's thread (mode + scope)
  const metadataKey = JSON.stringify({ mode: config.mode, ...metadata });

  useEffect(() => {
    if (!open || conversation || isDemoMode) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.agents.listConversations({ agent_name: AMEEN_AGENT_NAME });
        const meta = JSON.parse(metadataKey);
        const existing = (list || []).find((c) => {
          if (!c.metadata) return false;
          return Object.entries(meta).every(([k, v]) => c.metadata[k] === v);
        });
        const conv = existing || await base44.agents.createConversation({
          agent_name: AMEEN_AGENT_NAME,
          metadata: {
            name: `${AMEEN_DISPLAY_NAME} · ${config.subtitle}`,
            context: `الوضع النشط: ${config.subtitle}`,
            ...meta,
          },
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {}
      setLoading(false);
    })();
  }, [open, conversation, metadataKey, isDemoMode, config.mode, config.subtitle]);

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

  const panel = (children) => (
    <Sheet open={open} onOpenChange={setOpen}>
      {children}
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 gap-0" dir="rtl">
        {/* Institutional identity header — maroon with gold emblem */}
        <div className="bg-sidebar text-sidebar-foreground px-4 py-3.5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-accent/20 flex items-center justify-center shrink-0">
            <AmeenIcon className="w-4 h-4 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold tracking-wide leading-tight text-sidebar-foreground">
              {AMEEN_DISPLAY_NAME}
            </SheetTitle>
            <p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5 truncate">
              {config.subtitle}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          {isDemoMode ? (
            <div className="text-center py-12 space-y-2">
              <AmeenIcon className="w-8 h-8 text-accent/40 mx-auto" />
              <p className="text-sm text-muted-foreground">أمين متاح للمستخدمين المسجّلين.</p>
              <p className="text-xs text-muted-foreground">سجّل الدخول لاستخدامه في هذه الصفحة.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 space-y-1.5">
              <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-3">
                <AmeenIcon className="w-5 h-5 text-primary/50" />
              </div>
              <p className="text-sm font-medium text-foreground">مرحباً بك، معك أمين</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">{config.emptyHint}</p>
            </div>
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} agentIcon={AmeenIcon} />)
          )}
        </div>

        {!isDemoMode && (
          <div className="p-3 border-t border-border flex gap-2 bg-card">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="اكتب رسالتك…"
              className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30 transition-colors"
              disabled={sending}
            />
            <Button size="icon" onClick={send} disabled={sending || !input.trim()} className="rounded-lg shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );

  if (variant === "floating") {
    return panel(
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-dark transition-all hover:scale-105",
          buttonClassName
        )}
        aria-label={AMEEN_DISPLAY_NAME}
      >
        <AmeenIcon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">{AMEEN_DISPLAY_NAME}</span>
      </button>
    );
  }

  return panel(
    <Button size="sm" variant="outline" className={buttonClassName} onClick={() => setOpen(true)}>
      <AmeenIcon className="w-3.5 h-3.5" />
      {AMEEN_DISPLAY_NAME}
    </Button>
  );
}
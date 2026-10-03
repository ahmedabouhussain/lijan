import React, { useEffect, useState, useRef, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Maximize2, Minimize2, ShieldCheck, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AmeenEmblem from "@/components/ameen/AmeenEmblem";
import MessageBubble from "./copilot/MessageBubble";
import { cn } from "@/lib/utils";
import { AMEEN_AGENT_NAME } from "@/lib/ameenAgent";
import { AMEEN_SANDBOX_AGENT_NAME } from "@/lib/ameenContext";
import { useAmeen } from "@/lib/AmeenContext";

/**
 * AgentChatPanel — the single «أمين» chat surface.
 * One identity, one engine; the active context and role come from AmeenContext.
 */
export default function AgentChatPanel({ variant = "inline", buttonClassName }) {
  const {
    identity,
    context,
    contextKey,
    roleProfile,
    organization,
    committee,
    scopeKey,
    route,
    demoPersonaKey,
    openingMessage,
    contextPath,
    contextPathEn,
    lang,
    accessDenied,
    isDemo,
    isActive,
    t,
  } = useAmeen();

  // One identity, two data scopes: the exploration experience reads sandbox data only.
  const agentName = isDemo ? AMEEN_SANDBOX_AGENT_NAME : AMEEN_AGENT_NAME;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scopeNotice, setScopeNotice] = useState(null);
  const scrollRef = useRef(null);
  const prevScopeRef = useRef(scopeKey);

  const name = t(identity.name.ar, identity.name.en);
  const contextLabel = t(context.label.ar, context.label.en);
  const roleLabel = t(roleProfile.label.ar, roleProfile.label.en);
  const scopeName = committee
    ? t(committee.name_ar || committee.name_en, committee.name_en || committee.name_ar)
    : organization
      ? t(organization.name_ar || organization.name_en, organization.name_en || organization.name_ar)
      : null;

  // Isolation key: conversations never cross actor / organization / committee / context.
  const metadata = useMemo(() => {
    const m = { scope: scopeKey, context_key: contextKey };
    if (scopeName) m.scope_name = scopeName;
    return m;
  }, [scopeKey, contextKey, scopeName]);
  const metadataKey = JSON.stringify(metadata);

  // Crossing into another context starts a clean, non-mixing thread.
  useEffect(() => {
    if (prevScopeRef.current === scopeKey) return;
    prevScopeRef.current = scopeKey;
    setConversation(null);
    setMessages([]);
    setScopeNotice(contextLabel);
  }, [scopeKey, contextLabel]);

  useEffect(() => {
    if (!open || conversation || !isActive || accessDenied) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.agents.listConversations({ agent_name: agentName });
        const meta = JSON.parse(metadataKey);
        const existing = (list || []).find((c) => {
          if (!c.metadata) return false;
          return Object.entries(meta).every(([k, v]) => c.metadata[k] === v);
        });
        const conv = existing || await base44.agents.createConversation({
          agent_name: agentName,
          metadata: {
            name: `${name} · ${scopeName || contextLabel}`,
            context: `السياق: ${contextLabel} · الدور: ${roleLabel}`,
            ...meta,
          },
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {}
      setLoading(false);
    })();
  }, [open, conversation, metadataKey, isActive, accessDenied, agentName, name, scopeName, contextLabel, roleLabel]);

  useEffect(() => {
    if (!conversation) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) =>
      setMessages(data.messages || [])
    );
    return unsub;
  }, [conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || sending) return;
    setInput("");
    setSending(true);
    // Every consultation is recorded — «أمين» is never a silent channel.
    base44.functions.invoke("LogAmeenAction", {
      org_ref: route?.orgRef || null,
      committee_ref: route?.committeeRef || null,
      context_key: contextKey,
      question: content,
      demo_mode: isDemo,
      demo_persona_key: demoPersonaKey,
    }).catch(() => {});
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } catch {}
    setSending(false);
  };

  const disabled = !isActive || accessDenied || sending;

  const panel = (children) => (
    <Sheet open={open} onOpenChange={setOpen}>
      {children}
      <SheetContent
        side="left"
        className={cn(
          "w-full flex flex-col p-0 gap-0 transition-[max-width] duration-200",
          expanded ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        {/* Identity header */}
        <div className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center gap-3 border-b border-sidebar-border">
          <AmeenEmblem size={36} tone="inverse" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm font-semibold tracking-wide leading-tight text-sidebar-foreground">
              {name}
            </SheetTitle>
            <p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5">
              {t(identity.title.ar, identity.title.en)}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors"
            aria-label={expanded ? t("تصغير", "Collapse") : t("عرض كامل", "Expand")}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Live context strip */}
        <div className="px-4 py-2.5 bg-card border-b border-border space-y-1.5" dir="auto">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="font-medium">
              {t("السياق الحالي", "Current context")}: {scopeName ? `${scopeName} · ` : ""}{contextLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>{t("دورك", "Your role")}: {roleLabel}</span>
          </div>
          {(() => {
            const path = lang === "ar" ? contextPath : (contextPathEn || contextPath);
            const parts = path?.parts || [];
            if (parts.length === 0) return null;
            return (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {parts.join(lang === "ar" ? " ← " : " → ")}
              </p>
            );
          })()}
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t(context.scopeNote.ar, context.scopeNote.en)}</p>
          {isDemo && (
            <p className="text-[11px] text-accent leading-relaxed">
              {t(
                "نطاق العرض التجريبي — بيانات افتراضية غير حقيقية، والسجلات النظامية غير متاحة في هذا الوضع.",
                "Exploration scope — fictional data only; governed records are not reachable in this mode."
              )}
            </p>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background" dir="auto">
          {!isActive ? (
            <div className="text-center py-12 space-y-2">
              <Lock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("أمين متاح للمستخدمين المسجّلين.", "Ameen is available to registered users.")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("سجّل الدخول لاستخدامه في هذا السياق.", "Sign in to use Ameen in this context.")}
              </p>
            </div>
          ) : accessDenied ? (
            <div className="text-center py-12 space-y-2">
              <Lock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("لا تملك عضوية فعّالة في هذا النطاق.", "You hold no active membership in this scope.")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("لا يمكن لأمين الوصول إلى محتوى لست طرفاً فيه.", "Ameen cannot reach content you are not party to.")}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {scopeNotice && messages.length === 0 && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs text-foreground leading-relaxed">
                  {t("تم الانتقال إلى", "Switched to")} {scopeNotice}.{" "}
                  {t(
                    "لن تُستخدم معلومات السياق السابق هنا.",
                    "Information from the previous context will not be used here."
                  )}
                </div>
              )}

              {messages.length === 0 ? (
                <div className="py-8 space-y-5">
                  <div className="text-center space-y-1.5">
                    <AmeenEmblem size={44} tone="outline" className="mx-auto" />
                    <p className="text-sm font-medium text-foreground">
                      {t("مرحباً بك، معك أمين", "Welcome — Ameen here")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed px-2">
                      {openingMessage
                        ? t(openingMessage.ar, openingMessage.en)
                        : t(context.scopeNote.ar, context.scopeNote.en)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {context.prompts.map((p) => {
                      const label = t(p.ar, p.en);
                      return (
                        <button
                          key={p.en}
                          onClick={() => send(label)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <MessageBubble key={i} message={m} />)
              )}
            </>
          )}
        </div>

        {isActive && !accessDenied && (
          <div className="p-3 border-t border-border flex gap-2 bg-card" dir="auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={t("اكتب رسالتك…", "Type your message…")}
              className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30 transition-colors"
              disabled={disabled}
            />
            <Button
              size="icon"
              onClick={() => send()}
              disabled={disabled || !input.trim()}
              className="rounded-lg shrink-0"
            >
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
          "flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-dark transition-all hover:scale-105",
          buttonClassName
        )}
        aria-label={name}
      >
        <AmeenEmblem size={22} tone="inverse" />
        <span className="text-xs font-semibold whitespace-nowrap">{name}</span>
      </button>
    );
  }

  return panel(
    <Button size="sm" variant="outline" className={buttonClassName} onClick={() => setOpen(true)}>
      <AmeenEmblem size={16} tone="outline" />
      {name}
    </Button>
  );
}
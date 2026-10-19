import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Maximize2, Minimize2, ShieldCheck, Lock, ShieldAlert, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AmeenEmblem from "@/components/ameen/AmeenEmblem";
import MessageBubble from "./copilot/MessageBubble";
import { cn } from "@/lib/utils";
import { AMEEN_AGENT_NAME } from "@/lib/ameenAgent";
import { AMEEN_SANDBOX_AGENT_NAME } from "@/lib/ameenContext";
import { nameOf } from "@/lib/l10n";
import { stripAmeenDirective, isAmeenReloadMessage } from "@/lib/ameenLocale";
import { ameenName } from "@/lib/ameenIdentity";
import { useAmeen } from "@/lib/AmeenContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

/**
 * AgentChatPanel — the single «أمين» chat surface.
 * One identity, one engine; the active context and role come from AmeenContext.
 */

/**
 * Every refusal gets its own sentence. ONE generic message for a lapsed session, a foreign
 * conversation and an engine fault alike leaves the reader with nothing to act on — and hid a
 * real server fault behind a sentence that named no cause.
 */
function refusalMessage(code, t) {
  switch (code) {
    case "unauthenticated":
      return t("سجّل الدخول لاستخدام «أمين».", "Sign in to consult AMEEN.");
    case "no_session":
    case "expired":
    case "revoked":
    case "unknown_persona":
      return t(
        "انتهت جلسة الاستكشاف أو أُبطلت — أعد الدخول إلى العرض التجريبي.",
        "The exploration session has ended or was revoked — re-enter the exploration experience."
      );
    case "not_found":
      return t(
        "فتُح سياق جديد: هذه المحادثة مرتبطة بسياق لم تعد فيه.",
        "A new context is being opened: this conversation belongs to a context you are no longer in."
      );
    case "conversation_not_available":
      return t(
        "لم تعد هذه المحادثة متاحة — يُفتح سياق جديد وتبقى رسالتك في الحقل.",
        "This conversation is no longer available — a new one is opening, and your message is kept in the box."
      );
    case "engine_unavailable":
      return t(
        "تعذّر الوصول إلى محرك «أمين» الآن. أعد المحاولة بعد قليل.",
        "The AMEEN engine could not be reached. Please try again shortly."
      );
    case "not_a_member":
    case "no_seat":
    case "showcase_scope":
      return t("لا تملك عضوية فعّالة في هذا النطاق.", "You hold no active membership in this scope.");
    default:
      return t("تعذّر إرسال الطلب إلى أمين.", "The request to AMEEN could not be sent.");
  }
}

export default function AgentChatPanel({ variant = "inline", buttonClassName, collapsed = false }) {
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
    verified,
    verifyFailed,
    reverify,
    isDemo,
    isActive,
    pendingPrompt,
    consumeAmeenPrompt,
    t,
  } = useAmeen();

  // One identity, two data scopes: the exploration experience reads sandbox data only.
  const agentName = isDemo ? AMEEN_SANDBOX_AGENT_NAME : AMEEN_AGENT_NAME;
  const { showcaseToken } = useEffectiveActor();
  const sendLock = useRef(false);
  const [sendError, setSendError] = useState(null);

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

  const name = ameenName(lang);
  const contextLabel = t(context.label.ar, context.label.en);
  const roleLabel = t(roleProfile.label.ar, roleProfile.label.en);
  // ONE language per page: the active language's own name only. The other language is
  // never substituted silently — a missing name falls back to the context label.
  const scopeName = committee
    ? nameOf(committee, lang, "name")
    : organization
      ? nameOf(organization, lang, "name")
      : null;

  // Locale changes continue the same scope-bound conversation; older messages stay intact.
  const metadata = useMemo(() => ({
    scope: scopeKey, context_key: contextKey,
    committee_id: committee?.id || null, organization_id: organization?.id || null,
  }), [scopeKey, contextKey, committee?.id, organization?.id]);
  const metadataKey = JSON.stringify(metadata);

  // Crossing into another context starts a clean, non-mixing thread.
  useEffect(() => {
    if (prevScopeRef.current === scopeKey) return;
    prevScopeRef.current = scopeKey;
    setConversation(null);
    setMessages([]);
    setScopeNotice(contextLabel);
  }, [scopeKey, contextLabel]);

  // The next request carries the current UI locale; changing it never clears history.

  useEffect(() => {
    // A scoped route opens its conversation only AFTER the server has stated the scope: the
    // conversation is bound to the verified ids, so one opened ahead of that verdict would be
    // bound to nothing while every question carried a committee — a refusal on a legitimate ask.
    const scopeReady = !route.orgRef || verified;
    if (!open || conversation || !isActive || accessDenied || !scopeReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.agents.listConversations({ agent_name: agentName });
        const meta = JSON.parse(metadataKey);
        // A thread is reused only when it is bound to the SAME organization and committee — the
        // scope string alone could re-attach a thread to a scope it was not opened in.
        const existing = (list || []).find((c) => {
          if (!c.metadata) return false;
          return c.metadata.scope === meta.scope
            && c.metadata.context_key === meta.context_key
            && (c.metadata.committee_id || null) === (meta.committee_id || null)
            && (c.metadata.organization_id || null) === (meta.organization_id || null);
        });
        const conv = existing ? await base44.agents.getConversation(existing.id) : await base44.agents.createConversation({
          agent_name: agentName,
          metadata: {
            name: `${name} · ${scopeName || contextLabel}`,
            context:
              lang === "ar"
                ? `السياق: ${contextLabel} · الدور: ${roleLabel} · لغة الرد: العربية الفصحى الرسمية`
                : `Context: ${contextLabel} · Role: ${roleLabel} · Reply language: English only — write the entire reply in English, including headings, labels and table columns.`,
            ...meta, ui_locale: lang, response_language: lang,
          },
        });
        if (!cancelled) {
          setConversation(conv);
          setMessages(conv.messages || []);
          setSendError(null);
        }
      } catch (error) {
        if (!cancelled) {
          // A refusal from the server names itself; anything else is a transport fault.
          const code = error?.response?.data?.code || "";
          setSendError(
            code
              ? refusalMessage(code, t)
              : t('تعذّر فتح محادثة أمين.', 'The AMEEN conversation could not be opened.')
          );
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, conversation, metadataKey, isActive, accessDenied, verified, verifyFailed, route.orgRef, agentName, name, scopeName, contextLabel, roleLabel]);

  useEffect(() => {
    if (!conversation || conversation.metadata?.scope !== scopeKey) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      if (data.metadata?.scope && data.metadata.scope !== scopeKey) return;
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation, scopeKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // History is evidence: never regenerate or replace previous-language replies.
  // The server adds the active locale contract only to the next consultation.
  const displayMessages = useMemo(() => messages
    .filter((m) => !isAmeenReloadMessage(m.content))
    .map((m) => ({ ...m, content: stripAmeenDirective(m.content) })), [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || verifyFailed || conversation.metadata?.scope !== scopeKey || sendLock.current) return;
    sendLock.current = true;
    setSendError(null);
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
      language: lang,
      showcase_token: isDemo ? showcaseToken : null,
    }).catch(() => {});
    try {
      await base44.functions.invoke('SendAmeenMessage', { conversation_id: conversation.id, language: lang, question: content, scope_key: scopeKey, context_key: contextKey, committee_id: committee?.id || null, organization_id: organization?.id || null, showcase_token: isDemo ? showcaseToken : null });
    } catch (error) {
      const code = error?.response?.data?.code || "";
      setSendError(refusalMessage(code, t));
      // A conversation that no longer belongs to this scope is not a dead end: it is dropped so a
      // fresh, correctly bound one opens — and the question is handed back into the box, not lost.
      if (code === "not_found" || code === "conversation_not_available") {
        setConversation(null);
        setMessages([]);
        setInput(content);
      }
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  // A contextual quick action asks «أمين» a question: open the surface and send it in the
  // CURRENT scope. The prompt is consumed once, so it can never re-fire on a later render.
  useEffect(() => {
    if (!pendingPrompt || !isActive || accessDenied || verifyFailed) return;
    setOpen(true);
    setScopeNotice(null);
    if (!conversation || loading) return;
    send(pendingPrompt);
    consumeAmeenPrompt();
  }, [pendingPrompt, conversation, loading, isActive, accessDenied]);

  const disabled = !isActive || accessDenied || verifyFailed || sending || loading || !conversation || conversation.metadata?.scope !== scopeKey;

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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {sendError && <p role="alert" className="text-sm text-destructive">{sendError}</p>}
          {!isActive ? (
            <div className="text-center py-12 space-y-2">
              <Lock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("«أمين» متاح للمستخدمين المسجّلين.", "AMEEN is available to registered users.")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("سجّل الدخول لاستخدامه في هذا السياق.", "Sign in to use AMEEN in this context.")}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link to="/login">{t("تسجيل الدخول", "Sign in")}</Link>
              </Button>
            </div>
          ) : accessDenied ? (
            <div className="text-center py-12 space-y-2">
              <Lock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("لا تملك عضوية فعّالة في هذا النطاق.", "You hold no active membership in this scope.")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("لا يمكن لـ«أمين» الوصول إلى محتوى لست طرفاً فيه.", "AMEEN cannot reach content you are not party to.")}
              </p>
            </div>
          ) : verifyFailed ? (
            <div className="text-center py-12 space-y-2">
              <ShieldAlert className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("تعذّر التحقق من سياقك الآن.", "Your context could not be verified right now.")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "لا يسأل «أمين» ولا يجيب قبل أن يتحقق الخادم من سياقك ودورك.",
                  "AMEEN neither asks nor answers before the server verifies your context and role."
                )}
              </p>
              <Button size="sm" variant="outline" onClick={reverify} className="mt-1">
                <RefreshCw className="w-4 h-4" />
                {t("إعادة المحاولة", "Try again")}
              </Button>
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
                      {t("مرحباً بك، معك «أمين»", "Welcome — AMEEN here")}
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
                displayMessages.map((m, i) => <MessageBubble key={i} message={m} />)
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

  // Inside the shell sidebar: a full navigation row when open, a round icon when collapsed.
  // Same panel, same identity — only the entry point differs.
  if (variant === "nav") {
    return panel(
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={collapsed ? name : undefined}
        aria-label={name}
        className={cn(
          "flex items-center w-full min-h-[46px] rounded-md bg-white/10 text-sidebar-foreground transition-colors",
          "hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          collapsed ? "justify-center px-0" : "gap-3 px-2.5"
        )}
      >
        <AmeenEmblem size={20} tone="inverse" />
        {!collapsed && <span className="text-[15px] font-medium truncate">{name}</span>}
      </button>
    );
  }

  if (variant === "floating") {
    return panel(
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-primary text-primary-foreground shadow-elevation-3 hover:bg-primary-dark transition-all duration-200 ease-sovereign hover:scale-105",
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
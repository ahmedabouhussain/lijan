import React, { useEffect, useState, useRef } from "react";
import { Bot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AgentChatShell from "./copilot/AgentChatShell";

const AGENT_NAME = "action_tracker";

export default function ActionTrackerChat() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || conversation) return;
    (async () => {
      setLoading(true);
      try {
        const me = await base44.auth.me();
        const name = me?.full_name || "";
        setUserName(name);
        const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        const existing = (list || []).find((c) => c.metadata?.owner_user_id === me?.id);
        let conv = existing;
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: `متابعة إجراءات ${name || ""}`, owner_user_id: me?.id },
          });
          if (name) {
            await base44.agents.addMessage(conv, { role: "user", content: `اسمي ${name}. ساعدني في متابعة الإجراءات المسندة إليّ وعرض المعلقة منها والمتأخرة.` });
          }
        }
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {}
      setLoading(false);
    })();
  }, [open, conversation]);

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

  return (
    <AgentChatShell
      icon={Bot}
      title="مساعد متابعة الإجراءات"
      triggerLabel="مساعد الإجراءات"
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      messages={messages}
      input={input}
      onInputChange={(e) => setInput(e.target.value)}
      onSend={send}
      sending={sending}
      scrollRef={scrollRef}
      emptyState={
        <div className="text-center py-12 space-y-1.5">
          <Bot className="w-8 h-8 text-accent/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">مرحباً بك في مساعد متابعة الإجراءات</p>
          <p className="text-xs text-muted-foreground">اطلب استعراض إجراءاتك المعلقة أو تحديث حالة إجراء معيّن.</p>
        </div>
      }
    />
  );
}
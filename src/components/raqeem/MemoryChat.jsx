import React, { useEffect, useState, useRef } from "react";
import { Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AgentChatShell from "./copilot/AgentChatShell";

const AGENT_NAME = "institutional_memory";

export default function MemoryChat() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || conversation) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        const existing = (list || []).find((c) => c.metadata?.scope === "institutional_memory");
        const conv = existing || await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "الذاكرة المؤسسية", scope: "institutional_memory" },
        });
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
      icon={Brain}
      title="مساعد الذاكرة المؤسسية"
      triggerLabel="مساعد الذاكرة"
      open={open}
      onOpenChange={setOpen}
      loading={loading}
      messages={messages}
      input={input}
      onInputChange={(e) => setInput(e.target.value)}
      onSend={send}
      sending={sending}
      scrollRef={scrollRef}
      placeholder="اكتب استعلامك…"
      emptyState={
        <div className="text-center py-12 space-y-1.5">
          <Brain className="w-8 h-8 text-accent/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">مرحباً بك في مساعد الذاكرة المؤسسية</p>
          <p className="text-xs text-muted-foreground">اسأل عن مبدأ مؤسسي، قرار تاريخي، أو سياق حوكمة سابق.</p>
        </div>
      }
    />
  );
}
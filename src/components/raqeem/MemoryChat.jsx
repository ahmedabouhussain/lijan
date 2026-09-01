import React, { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Brain, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "./copilot/MessageBubble";

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><Brain className="w-3.5 h-3.5" /> مساعد الذاكرة</Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base"><Brain className="w-4 h-4 text-accent" /> مساعد الذاكرة المؤسسية</SheetTitle>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20" dir="rtl">
          {loading && <p className="text-center text-sm text-muted-foreground py-8">جارٍ التحميل…</p>}
          {!loading && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 space-y-1">
              <p>مرحباً بك في مساعد الذاكرة المؤسسية.</p>
              <p className="text-xs">اسأل عن مبدأ مؤسسي، قرار تاريخي، أو سياق حوكمة سابق.</p>
            </div>
          )}
          {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        </div>
        <div className="p-3 border-t border-border flex gap-2" dir="rtl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="اكتب استعلامك…"
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={sending}
          />
          <Button size="icon" onClick={send} disabled={sending || !input.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
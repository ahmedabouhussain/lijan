import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";

export default function AgentChatShell({
  icon: Icon,
  title,
  triggerLabel,
  triggerVariant = "outline",
  open,
  onOpenChange,
  loading,
  messages,
  emptyState,
  input,
  onInputChange,
  onSend,
  sending,
  scrollRef,
  placeholder = "اكتب رسالتك…",
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" variant={triggerVariant}>
          <Icon className="w-3.5 h-3.5" /> {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        {/* Institutional header — maroon with gold accent */}
        <div className="bg-sidebar text-sidebar-foreground px-4 py-3.5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-sidebar-primary" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
        {/* Messages — warm white background */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background" dir="rtl">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            emptyState
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} agentIcon={Icon} />)
          )}
        </div>
        {/* Input — refined institutional styling */}
        <div className="p-3 border-t border-border flex gap-2 bg-card" dir="rtl">
          <input
            value={input}
            onChange={onInputChange}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
            placeholder={placeholder}
            className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30 transition-colors"
            disabled={sending}
          />
          <Button size="icon" onClick={onSend} disabled={sending || !input.trim()} className="rounded-lg shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
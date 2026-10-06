import React, { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/LanguageContext";

// Writes a note on the version in force. Private is the default; sharing is a deliberate choice.
export default function AnnotationComposer({ versionNumber, busy, onSubmit }) {
  const { t } = useLanguage();
  const [body, setBody] = useState("");
  const [anchor, setAnchor] = useState("");
  const [page, setPage] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  const submit = async () => {
    const ok = await onSubmit({ body, anchor_text: anchor || null, page_number: page ? Number(page) : null, is_private: isPrivate });
    if (ok) { setBody(""); setAnchor(""); setPage(""); }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        {t(`ملاحظة جديدة على الإصدار ${versionNumber} (النافذ)`, `New note on version ${versionNumber} (in force)`)}
      </p>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
        placeholder={t("نص الملاحظة", "Note text")} aria-label={t("نص الملاحظة", "Note text")} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
        <Input value={anchor} onChange={(e) => setAnchor(e.target.value)}
          placeholder={t("المقطع المقتبس (اختياري)", "Quoted passage (optional)")} aria-label={t("المقطع المقتبس", "Quoted passage")} />
        <Input type="number" min={1} value={page} onChange={(e) => setPage(e.target.value)}
          placeholder={t("الصفحة", "Page")} aria-label={t("رقم الصفحة", "Page number")} />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          {isPrivate ? t("خاصة — تظهر لي وحدي", "Private — visible to me only") : t("مشتركة مع أعضاء اللجنة", "Shared with committee members")}
        </label>
        <Button size="sm" onClick={submit} disabled={!body.trim() || busy === "create"}>
          {busy === "create" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {t("إضافة الملاحظة", "Add note")}
        </Button>
      </div>
    </div>
  );
}
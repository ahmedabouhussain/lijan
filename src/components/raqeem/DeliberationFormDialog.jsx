import React, { useState, useEffect } from "react";
import { L } from "@/lib/l10n";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export default function DeliberationFormDialog({ open, onOpenChange, committees, committeeMap, onSubmit }) {
  const [form, setForm] = useState({
    committee_id: "",
    topic: "",
    discussion_summary: "",
    decision_id: "none",
    outcome: "",
    deliberated_by: "",
  });
  const [decisions, setDecisions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.committee_id) {
      base44.entities.Decision.filter({ committee_id: form.committee_id })
        .then(setDecisions)
        .catch(() => setDecisions([]));
    } else {
      setDecisions([]);
    }
  }, [form.committee_id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.committee_id || !form.topic || !form.discussion_summary) return;
    setSubmitting(true);
    try {
      const committee = committeeMap[form.committee_id];
      await onSubmit({
        ...form,
        organization_id: committee?.organization_id,
        decision_id: form.decision_id === "none" ? null : form.decision_id,
        deliberated_at: new Date().toISOString(),
        status: "concluded",
      });
      setForm({ committee_id: "", topic: "", discussion_summary: "", decision_id: "none", outcome: "", deliberated_by: "" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{L.pair("تسجيل مداولة جديدة", "Record a New Deliberation")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">{L.pair("اللجنة *", "Committee *")}</Label>
            <Select value={form.committee_id} onValueChange={(v) => update("committee_id", v)}>
              <SelectTrigger><SelectValue placeholder={L.pair("اختر اللجنة", "Select the committee")} /></SelectTrigger>
              <SelectContent>
                {committees.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{L.name(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">{L.pair("الموضوع *", "Topic *")}</Label>
            <Input value={form.topic} onChange={(e) => update("topic", e.target.value)} placeholder={L.pair("موضوع المداولة", "Deliberation topic")} required />
          </div>
          <div>
            <Label className="mb-1.5 block">{L.pair("ملخص النقاش *", "Discussion Summary *")}</Label>
            <Textarea
              value={form.discussion_summary}
              onChange={(e) => update("discussion_summary", e.target.value)}
              placeholder={L.pair("تفاصيل النقاش والمداولات التي دارت حول الموضوع...", "Details of the discussion and deliberations on the topic…")}
              rows={4}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block">{L.pair("القرار المرتبط", "Related Decision")}</Label>
            <Select
              value={form.decision_id}
              onValueChange={(v) => update("decision_id", v)}
              disabled={!form.committee_id}
            >
              <SelectTrigger><SelectValue placeholder={!form.committee_id ? "اختر اللجنة أولاً" : "بدون قرار مرتبط"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{L.pair("بدون قرار مرتبط", "No related decision")}</SelectItem>
                {decisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.decision_number ? `${d.decision_number} — ` : ""}{L.title(d) || L.pair("قرار", "Decision")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">{L.pair("النتيجة", "Outcome")}</Label>
            <Input value={form.outcome} onChange={(e) => update("outcome", e.target.value)} placeholder={L.pair("نتيجة المداولة", "Deliberation outcome")} />
          </div>
          <div>
            <Label className="mb-1.5 block">{L.pair("المُداوِل", "Deliberated By")}</Label>
            <Input value={form.deliberated_by} onChange={(e) => update("deliberated_by", e.target.value)} placeholder={L.pair("اسم من قاد المداولة", "Name of the person who led the deliberation")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{L.pair("إلغاء", "Cancel")}</Button>
            <Button type="submit" disabled={submitting || !form.committee_id || !form.topic || !form.discussion_summary}>
              {submitting ? "جاري الحفظ..." : "حفظ المداولة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
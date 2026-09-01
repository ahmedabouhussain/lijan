import React, { useState, useEffect } from "react";
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
          <DialogTitle>تسجيل مداولة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">اللجنة *</Label>
            <Select value={form.committee_id} onValueChange={(v) => update("committee_id", v)}>
              <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
              <SelectContent>
                {committees.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">الموضوع *</Label>
            <Input value={form.topic} onChange={(e) => update("topic", e.target.value)} placeholder="موضوع المداولة" required />
          </div>
          <div>
            <Label className="mb-1.5 block">ملخص النقاش *</Label>
            <Textarea
              value={form.discussion_summary}
              onChange={(e) => update("discussion_summary", e.target.value)}
              placeholder="تفاصيل النقاش والمداولات التي دارت حول الموضوع..."
              rows={4}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block">القرار المرتبط</Label>
            <Select
              value={form.decision_id}
              onValueChange={(v) => update("decision_id", v)}
              disabled={!form.committee_id}
            >
              <SelectTrigger><SelectValue placeholder={!form.committee_id ? "اختر اللجنة أولاً" : "بدون قرار مرتبط"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون قرار مرتبط</SelectItem>
                {decisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.decision_number ? `${d.decision_number} — ` : ""}{d.title || d.title_ar || "قرار"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">النتيجة</Label>
            <Input value={form.outcome} onChange={(e) => update("outcome", e.target.value)} placeholder="نتيجة المداولة" />
          </div>
          <div>
            <Label className="mb-1.5 block">المُداوِل</Label>
            <Input value={form.deliberated_by} onChange={(e) => update("deliberated_by", e.target.value)} placeholder="اسم من قاد المداولة" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={submitting || !form.committee_id || !form.topic || !form.discussion_summary}>
              {submitting ? "جاري الحفظ..." : "حفظ المداولة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
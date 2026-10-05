import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Sparkles, Send, Edit3, Save, X, UserCheck, PenLine, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import StatusBadge from "@/components/raqeem/StatusBadge";
import SecureFileImage from "@/components/raqeem/SecureFileImage";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import { MINUTES_STATUS, ATTENDANCE_STATUS, MEMBER_ROLE } from "@/lib/raqeemUtils";
import { sanitizeRichText, formatRecordDate, hasSourceDrift } from "@/lib/richText";

export default function MinutesManager({ meeting, members, attendance, minutes, onChanged }) {
  const { t, lang } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(minutes?.body || "");
  const [summary, setSummary] = useState(minutes?.summary_ar || "");
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!minutes) return;
    base44.entities.Signature
      .filter({ document_type: "MeetingMinutes", document_id: minutes.id })
      .then((sigs) => setSignatures(sigs || []))
      .catch(() => {});
  }, [minutes]);

  const minutesTitle = () => L.pair(`محضر ${L.title(meeting)}`, `Minutes: ${L.title(meeting)}`);

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("GenerateMeetingMinutes", { meeting_id: meeting.id });
      if (res?.data?.minutes_id) {
        onChanged();
      }
    } catch {}
    setGenerating(false);
  };

  const saveBody = async () => {
    setSaving(true);
    try {
      await base44.entities.MeetingMinutes.update(minutes.id, { body: sanitizeRichText(body), summary_ar: sanitizeRichText(summary), generated_by_ai: false });
      setEditing(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const transition = async (newStatus, extra = {}) => {
    setTransitioning(true);
    try {
      await base44.entities.MeetingMinutes.update(minutes.id, { status: newStatus, ...extra });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "MeetingMinutes",
        entity_id: minutes.id,
        entity_title: minutesTitle(),
        description: `${L.pair("تغيير حالة المحضر إلى", "Minutes status changed to")} ${L.label(MINUTES_STATUS, newStatus, newStatus)}`,
      });
      onChanged();
    } catch {}
    setTransitioning(false);
  };

  const setAttendance = async (memberId, memberName, memberRole, status) => {
    const existing = attendance.find((a) => a.member_id === memberId);
    try {
      if (existing) {
        await base44.entities.Attendance.update(existing.id, { attendance_status: status });
      } else {
        await base44.entities.Attendance.create({
          meeting_id: meeting.id,
          committee_id: meeting.committee_id,
          member_id: memberId,
          member_name: memberName,
          member_role: memberRole,
          attendance_status: status,
        });
      }
      onChanged();
    } catch {}
  };

  const presentCount = attendance.filter((a) => a.attendance_status === "present" || a.attendance_status === "late").length;
  const quorumMet = presentCount >= (meeting.quorum_required || 3);

  // The meeting record is the authority for the date. A draft that disagrees with it is not a
  // formatting detail: it is reported as drift and must be reviewed before approval.
  const dateDrift = hasSourceDrift(minutes?.call_to_order, meeting?.date);

  const signElectronically = async () => {
    if (!currentUser) return;
    setSigning(true);
    try {
      await base44.entities.Signature.create({
        document_type: "MeetingMinutes",
        document_id: minutes.id,
        document_title: minutesTitle(),
        committee_id: meeting.committee_id,
        signer_name: currentUser.full_name,
        signer_user_id: currentUser.id,
        signer_role: "chair",
        signature_method: currentUser.signature_image_url ? "drawn" : "typed",
        signature_text: currentUser.signature_text || currentUser.full_name,
        signature_image_url: currentUser.signature_image_url || undefined,
        intent: "approve",
        signed_at: new Date().toISOString(),
        status: "active",
      });
      await base44.entities.MeetingMinutes.update(minutes.id, {
        status: "approved",
        approved_by_name: currentUser.full_name,
        approved_date: new Date().toISOString().slice(0, 10),
      });
      await base44.entities.AuditLog.create({
        action: "sign",
        entity_type: "MeetingMinutes",
        entity_id: minutes.id,
        entity_title: minutesTitle(),
        description: L.pair(`توقيع إلكتروني بواسطة ${currentUser.full_name}`, `Electronic signature by ${currentUser.full_name}`),
      });
      onChanged();
    } catch {}
    setSigning(false);
  };

  return (
    <div className="space-y-6">
      {/* Attendance */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" /> {t("الحضور", "Attendance")}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className={quorumMet ? "text-emerald-700" : "text-destructive"}>
              {quorumMet ? `✓ ${t("تحقق النصاب", "Quorum met")}` : `✗ ${t("لم يتحقق النصاب", "Quorum not met")}`}
            </span>
            <span className="text-muted-foreground">({presentCount}/{meeting.quorum_required || 3})</span>
          </div>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{t("لا يوجد أعضاء مسجلون في اللجنة", "No members registered in this committee")}</p>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => {
              const rec = attendance.find((a) => a.member_id === m.id);
              const current = rec?.attendance_status || "present";
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{L.name(m, "full_name")}</span>
                    {m.role && <span className="text-xs text-muted-foreground mr-2">· {L.label(MEMBER_ROLE, m.role, m.role)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {Object.entries(ATTENDANCE_STATUS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setAttendance(m.id, m.full_name, m.role, key)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          current === key ? val.color + " ring-1 ring-current" : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {t(val.ar, val.en)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Minutes document */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> {t("محضر الاجتماع", "Minutes")}
          </h3>
          {minutes && <StatusBadge {...L.status(MINUTES_STATUS, minutes.status, minutes.status)} />}
        </div>

        {!minutes && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{t("لا يوجد محضر بعد — أنشئ مسودة تلقائية من بيانات الاجتماع", "No minutes yet — generate an automatic draft from the meeting data")}</p>
            <Button onClick={generateDraft} disabled={generating}>
              <Sparkles className="w-3.5 h-3.5" /> {generating ? t("جارٍ إنشاء المحضر...", "Generating minutes...") : t("إنشاء مسودة المحضر تلقائياً", "Generate minutes draft")}
            </Button>
          </div>
        )}

        {minutes && editing && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("ملخص المحضر", "Minutes summary")}</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t("نص المحضر (Markdown)", "Minutes body (Markdown)")}</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveBody} disabled={saving}>
                <Save className="w-3.5 h-3.5" /> {saving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ", "Save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setBody(minutes.body); }}>
                <X className="w-3.5 h-3.5" /> {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </div>
        )}

        {minutes && !editing && (
          <div className="space-y-4">
            {t(minutes.summary_ar, minutes.summary_en) && (
              <div className="bg-secondary/40 rounded-md p-3 text-sm text-foreground leading-relaxed border-r-2 border-primary">
                {t(minutes.summary_ar, minutes.summary_en)}
              </div>
            )}
            {/* The authoritative date, and a conspicuous warning when the stored draft disagrees. */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("تاريخ الاجتماع من سجله:", "Meeting date, from the meeting record:")} <span className="text-foreground">{formatRecordDate(meeting.date, lang)}</span></p>
              {minutes.call_to_order && (
                <p>{t("تاريخ المسودة المحفوظة:", "Stored draft date:")} {minutes.call_to_order}</p>
              )}
            </div>
            {dateDrift && (
              <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" />
                <p className="text-xs text-state-warning-ink">
                  {t(
                    `تاريخ هذه المسودة (${minutes.call_to_order || "—"}) لا يطابق تاريخ الاجتماع في سجله (${meeting.date || "—"}). راجعها قبل الاعتماد؛ لا تُعتمد كما هي.`,
                    `This draft's date (${minutes.call_to_order || "—"}) does not match the meeting record date (${meeting.date || "—"}). Review it before approval; it must not be approved as it stands.`,
                  )}
                </p>
              </div>
            )}
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
              <ReactMarkdown>{sanitizeRichText(minutes.body) || "—"}</ReactMarkdown>
            </div>

            {/* Lifecycle controls */}
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => { setBody(minutes.body); setSummary(minutes.summary_ar || ""); setEditing(true); }}>
                <Edit3 className="w-3.5 h-3.5" /> {t("تحرير", "Edit")}
              </Button>
              {minutes.status === "draft" && (
                <Button size="sm" onClick={() => transition("in_review")} disabled={transitioning}>
                  <Send className="w-3.5 h-3.5" /> {t("إرسال للمراجعة", "Send for review")}
                </Button>
              )}
              {minutes.status === "in_review" && (
                <Button size="sm" onClick={signElectronically} disabled={signing || !currentUser}>
                  <PenLine className="w-3.5 h-3.5" /> {signing ? t("جارٍ التوقيع...", "Signing...") : t("توقيع واعتماد إلكترونياً", "Sign and approve electronically")}
                </Button>
              )}
              {minutes.status === "approved" && (
                <Button size="sm" onClick={() => transition("issued", { issued_date: new Date().toISOString().slice(0, 10) })} disabled={transitioning}>
                  <Send className="w-3.5 h-3.5" /> {t("إصدار وإرسال للأعضاء", "Issue and send to members")}
                </Button>
              )}
              {(minutes.status === "issued" || minutes.status === "approved") && (
                <Button size="sm" variant="outline" onClick={() => transition("amended")} disabled={transitioning}>
                  <Edit3 className="w-3.5 h-3.5" /> {t("تعديل لاحق", "Amend later")}
                </Button>
              )}
              {minutes.generated_by_ai && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-auto">
                  <Sparkles className="w-3 h-3" /> {t("مسودة مولدة بالذكاء الاصطناعي", "AI-generated draft")}
                </span>
              )}
            </div>

            {/* Signatures */}
            {signatures.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <PenLine className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">{t("التوقيعات الإلكترونية", "E-Signatures")}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {signatures.filter((s) => s.status === "active").map((sig) => (
                    <div key={sig.id} className="border border-border rounded-md p-3 bg-secondary/20">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-xs font-medium text-foreground">{sig.signer_name}</div>
                        <StatusBadge label={t("موقّع", "Signed")} colorClass="bg-emerald-50 text-emerald-700" />
                      </div>
                      {sig.signature_image_url ? (
                        <SecureFileImage fileRef={sig.signature_image_url} entityType="Signature" entityId={sig.id} alt="signature" className="h-10 object-contain mb-1" />
                      ) : (
                        <div className="text-xl text-foreground mb-1" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>
                          {sig.signature_text}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(sig.signed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
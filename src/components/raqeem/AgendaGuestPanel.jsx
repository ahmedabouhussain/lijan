import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { UserPlus, Users, X, ShieldCheck, Ban, Eye, Copy, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// AgendaGuestPanel — item-level guests for ONE agenda item.
//
// Invite (bounded expiry, explicitly listed attachments), see the live state of each invitation,
// revoke, and PREVIEW exactly what the guest receives — including what is withheld from them. Both
// reads go through the governed recipient-preview command, so the panel never assembles guest scope
// on its own.

const STATE_TONE = {
  active: "bg-state-success-surface text-state-success-ink",
  expired: "bg-state-neutral-surface text-state-neutral-ink",
  revoked: "bg-state-danger-surface text-state-danger-ink",
  scheduled: "bg-state-progress-surface text-state-progress-ink",
  token_unknown: "bg-state-neutral-surface text-state-neutral-ink",
};

export default function AgendaGuestPanel({ agendaItem, committeeId, canManage }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [guests, setGuests] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({ guest_name: "", guest_organization: "", purpose: "", expires_at: "" });
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("PreviewGuestAccess", { agenda_item_id: agendaItem.id, committee_id: committeeId });
      const d = res?.data || res;
      setGuests(d?.guests ?? null);
      if (d?.unread?.length) setError(t("تعذّرت قراءة قائمة الضيوف — القائمة غير مكتملة", "The guest list could not be read — it is incomplete"));
    } catch (e) {
      setGuests(null);
      setError(e?.response?.data?.error || e?.message || t("تعذّر تحميل الضيوف", "Could not load guests"));
    }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, agendaItem.id]);

  useEffect(() => {
    if (!open || !canManage) return;
    base44.entities.Document.filter({ committee_id: committeeId }, { limit: 100 })
      .then((rows) => setDocuments((Array.isArray(rows) ? rows : rows?.items || []).filter((d) => d.document_type !== "minutes" && !["restricted", "highly_restricted"].includes(d.classification))))
      .catch(() => setDocuments([]));
  }, [open, canManage, committeeId]);

  const invite = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await base44.functions.invoke("InviteAgendaItemGuest", {
        action: "invite",
        agenda_item_id: agendaItem.id,
        committee_id: committeeId,
        ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        permitted_document_ids: selected,
      });
      const d = res?.data || res;
      if (d?.status !== "ok") throw new Error(d?.error || "invite failed");
      setForm({ guest_name: "", guest_organization: "", purpose: "", expires_at: "" });
      setSelected([]);
      setMessage({ kind: "ok", text: t("تم إنشاء الدعوة.", "Invitation created."), link: d.invite_link, delivery: d.delivery });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error_ar || e?.response?.data?.error || e?.message || t("فشلت الدعوة", "Invitation failed"));
    }
    setBusy(false);
  };

  const revoke = async (guestId) => {
    setBusy(true); setError(null);
    try {
      await base44.functions.invoke("InviteAgendaItemGuest", { action: "revoke", guest_id: guestId, committee_id: committeeId });
      setMessage({ kind: "ok", text: t("أُلغيت الدعوة. الإلغاء يمنع القراءة الجديدة ولا يسحب ما نُزِّل سابقًا.", "Invitation revoked. Revocation stops new reads; it does not recall material already downloaded.") });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error_ar || e?.response?.data?.error || e?.message || t("فشل الإلغاء", "Revoke failed"));
    }
    setBusy(false);
  };

  const showPreview = async (guestId) => {
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("PreviewGuestAccess", { guest_id: guestId, committee_id: committeeId });
      setPreview((res?.data || res)?.preview || null);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّرت المعاينة", "Preview failed"));
    }
    setBusy(false);
  };

  const activeCount = (guests || []).filter((g) => g.allowed).length;

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary"
        aria-expanded={open}
      >
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        {t(`ضيوف هذا البند${guests ? ` (${activeCount}/${guests.length})` : ""}`, `Guests for this item${guests ? ` (${activeCount}/${guests.length})` : ""}`)}
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
            </div>
          )}
          {message && (
            <div className="rounded-md bg-state-success-surface px-2 py-1.5 text-[11px] text-state-success-ink">
              <div>{message.text}</div>
              {message.link && (
                <div className="mt-1 flex items-center gap-2">
                  <code className="break-all">{message.link}</code>
                  <button onClick={() => navigator.clipboard?.writeText(window.location.origin + message.link)} className="inline-flex items-center gap-1 hover:underline">
                    <Copy className="w-3 h-3" />{t("نسخ", "Copy")}
                  </button>
                </div>
              )}
              {message.delivery && (
                <div className="mt-1 text-[10px] opacity-90">{lang === "ar" ? message.delivery.reason_ar : message.delivery.reason_en}</div>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />{t("جارٍ التحميل…", "Loading…")}
            </div>
          ) : guests === null ? (
            <div className="text-[11px] text-muted-foreground">{t("لم نستطع قراءة قائمة الضيوف.", "The guest list could not be read.")}</div>
          ) : guests.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">{t("لا ضيوف على هذا البند.", "No guests on this item.")}</div>
          ) : (
            <ul className="space-y-1.5">
              {guests.map((g) => (
                <li key={g.id} className="flex items-start justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium">{lang === "ar" ? g.name : (g.name_en || g.name)}</span>
                      <span className={cn("px-1 py-0.5 rounded text-[10px]", STATE_TONE[g.state] || STATE_TONE.token_unknown)}>
                        {g.state === "active" ? t("سارية", "Live") : g.state === "expired" ? t("منتهية", "Expired") : g.state === "revoked" ? t("ملغاة", "Revoked") : t("لم تبدأ", "Not yet valid")}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {g.organization ? `${g.organization} · ` : ""}
                      {t("حتى", "until")} {g.expires_at ? g.expires_at.slice(0, 10) : "—"} · {t("مرفقات", "attachments")}: {g.permitted_count} · {t("قراءات", "reads")}: {g.view_count}
                    </div>
                    {!g.allowed && g.reason_en && <div className="text-[10px] text-state-danger-ink mt-0.5">{lang === "ar" ? g.reason_ar : g.reason_en}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => showPreview(g.id)} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline" title={t("معاينة ما سيستلمه", "Preview what the guest receives")}>
                      <Eye className="w-3 h-3" />{t("معاينة", "Preview")}
                    </button>
                    {canManage && g.allowed && (
                      <button onClick={() => revoke(g.id)} disabled={busy} className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline disabled:opacity-50">
                        <Ban className="w-3 h-3" />{t("إلغاء", "Revoke")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {preview && (
            <div className="rounded-md border border-border bg-secondary/30 p-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />{t("ما سيستلمه الضيف بالضبط", "Exactly what the guest receives")}
                </div>
                <button onClick={() => setPreview(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
              <div className="mt-1 text-[11px]">
                <div><strong>{t("البند", "Item")}:</strong> {lang === "ar" ? preview.extract.item?.title : preview.extract.item?.title_en}</div>
                <div className="mt-0.5"><strong>{t("المرفقات المسموح بها", "Permitted attachments")}:</strong> {preview.extract.attachments.length ? preview.extract.attachments.map((a) => `${lang === "ar" ? a.title : a.title_en} (${a.document_type} v${a.version_number})`).join(" · ") : t("لا شيء", "none")}</div>
                <div className="mt-0.5 text-muted-foreground">{lang === "ar" ? preview.extract.file_delivery.reason_ar : preview.extract.file_delivery.reason_en}</div>
                {preview.withheld.length > 0 && (
                  <div className="mt-1 text-state-warning-ink">
                    <strong>{t("مُستبعَد من الضيف", "Withheld from the guest")}:</strong> {preview.withheld.map((w) => `${w.title} (${w.code})`).join(" · ")}
                  </div>
                )}
                <div className="mt-1 text-muted-foreground">
                  <strong>{t("لا يُرى أبدًا", "Never visible")}:</strong> {(lang === "ar" ? preview.scope_statement.never_ar : preview.scope_statement.never_en).join(" · ")}
                </div>
                {!preview.access.allowed && <div className="mt-1 text-state-danger-ink">{lang === "ar" ? preview.access.reason_ar : preview.access.reason_en}</div>}
              </div>
            </div>
          )}

          {canManage && (
            <div className="rounded-md border border-border p-2 space-y-2">
              <div className="text-[11px] font-semibold inline-flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />{t("دعوة ضيف إلى هذا البند", "Invite a guest to this item")}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div><Label className="text-[11px]">{t("اسم الضيف", "Guest name")}</Label><Input className="h-8 text-xs" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
                <div><Label className="text-[11px]">{t("الجهة الممثَّلة", "Represented body")}</Label><Input className="h-8 text-xs" value={form.guest_organization} onChange={(e) => setForm({ ...form, guest_organization: e.target.value })} /></div>
                <div><Label className="text-[11px]">{t("الغرض", "Purpose")}</Label><Input className="h-8 text-xs" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                <div><Label className="text-[11px]">{t("تنتهي في (إلزامي، 180 يومًا كحد أقصى)", "Expires on (required, max 180 days)")}</Label><Input type="date" className="h-8 text-xs" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
              {documents.length > 0 && (
                <div>
                  <Label className="text-[11px]">{t("مرفقات مسموح بها (لا تُدرج المحاضر أو المواد المقيَّدة)", "Permitted attachments (minutes and restricted material are not listable)")}</Label>
                  <div className="mt-1 max-h-28 overflow-y-auto space-y-1">
                    {documents.map((d) => (
                      <label key={d.id} className="flex items-center gap-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={selected.includes(d.id)}
                          onChange={(e) => setSelected(e.target.checked ? [...selected, d.id] : selected.filter((x) => x !== d.id))}
                        />
                        <span className="truncate">{d.title_ar || d.title} <span className="text-muted-foreground">({d.document_type})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button size="sm" className="h-7 text-[11px]" onClick={invite} disabled={busy || !form.guest_name.trim() || !form.expires_at}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("إنشاء الدعوة", "Create invitation")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
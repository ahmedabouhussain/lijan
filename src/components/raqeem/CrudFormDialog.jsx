import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCrudAction } from "@/hooks/useCrudAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2 } from "lucide-react";

/**
 * CrudFormDialog — reusable inline create/edit form for committee pages.
 * Calls a governed backend function and handles loading/error states.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - title: string (bilingual via t)
 * - fields: array of { name, label, type, required, placeholder, options, rows }
 * - functionName: backend function to invoke
 * - payload: static payload to merge with form data (e.g. { committee_id })
 * - onSuccess: (res) => void
 * - submitLabel: string
 */
export default function CrudFormDialog({
  open,
  onClose,
  title,
  fields,
  functionName,
  payload = {},
  initialValues = {},
  onSuccess,
  submitLabel,
}) {
  const { t } = useLanguage();
  const { submitting, error, execute } = useCrudAction();
  const [form, setForm] = useState(initialValues);

  if (!open) return null;

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  // Every control is programmatically associated with its label, so a screen reader
  // announces the field name instead of "edit text".
  const fieldId = (name) => `crud-field-${name}`;

  const submit = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.required && !String(form[f.name] || "").trim()) return;
    }
    try {
      // CreateCommitteeRecord expects form data wrapped in a `fields` object
      const body = functionName === "CreateCommitteeRecord"
        ? { ...payload, fields: { ...form } }
        : { ...payload, ...form };
      await execute(functionName, body, (res) => {
        setForm({ ...initialValues });
        onClose();
        if (onSuccess) onSuccess(res);
      });
    } catch {
      // error is already set in hook
    }
  };

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق النموذج", "Close form")}
          className="p-1 hover:bg-secondary rounded sovereign-focus"
        >
          <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <div role="alert" className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.name} className={f.fullWidth ? "md:col-span-2" : ""}>
            <Label htmlFor={fieldId(f.name)} className="text-xs">
              {f.label}
              {f.required && <span className="text-destructive" aria-hidden="true"> *</span>}
            </Label>
            {f.type === "select" ? (
              <select
                id={fieldId(f.name)}
                aria-required={f.required ? "true" : undefined}
                className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent sovereign-focus"
                value={form[f.name] || ""}
                onChange={(e) => setField(f.name, e.target.value)}
              >
                <option value="">—</option>
                {(f.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.label_ar || opt.label, opt.label_en || opt.label)}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <Textarea
                id={fieldId(f.name)}
                aria-required={f.required ? "true" : undefined}
                value={form[f.name] || ""}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={f.rows || 3}
                className="mt-1"
              />
            ) : (
              <Input
                id={fieldId(f.name)}
                aria-required={f.required ? "true" : undefined}
                type={f.type || "text"}
                value={form[f.name] || ""}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1"
                dir={f.type === "email" || f.type === "url" ? "ltr" : undefined}
              />
            )}
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={submitting} aria-busy={submitting} className="w-full min-h-[44px]">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
        {submitLabel || t("حفظ", "Save")}
      </Button>
    </div>
  );
}
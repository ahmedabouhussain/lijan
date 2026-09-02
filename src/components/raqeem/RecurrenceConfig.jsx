import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Repeat } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, ar: "أحد", en: "Sun" },
  { value: 1, ar: "إثنين", en: "Mon" },
  { value: 2, ar: "ثلاثاء", en: "Tue" },
  { value: 3, ar: "أربعاء", en: "Wed" },
  { value: 4, ar: "خميس", en: "Thu" },
  { value: 5, ar: "جمعة", en: "Fri" },
  { value: 6, ar: "سبت", en: "Sat" },
];

const RECURRENCE_TYPES = [
  { value: "none", ar: "مرة واحدة", en: "One-time" },
  { value: "daily", ar: "يومي", en: "Daily" },
  { value: "weekly", ar: "أسبوعي", en: "Weekly" },
  { value: "monthly", ar: "شهري", en: "Monthly" },
  { value: "quarterly", ar: "ربع سنوي", en: "Quarterly" },
];

export default function RecurrenceConfig({ value, onChange }) {
  const { t, lang } = useLanguage();

  const update = (patch) => onChange({ ...value, ...patch });

  const toggleDay = (day) => {
    const current = value.recurrence_days_of_week
      ? value.recurrence_days_of_week.split(",").map(Number).filter(n => !isNaN(n))
      : [];
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    update({ recurrence_days_of_week: next.join(",") });
  };

  const selectedDays = value.recurrence_days_of_week
    ? value.recurrence_days_of_week.split(",").map(Number).filter(n => !isNaN(n))
    : [];

  return (
    <div className="space-y-3 border border-border rounded-md p-3 bg-secondary/20">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{t("التكرار", "Recurrence")}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t("نمط التكرار", "Pattern")}</Label>
          <select
            className="w-full h-9 rounded-md border border-input px-3 text-sm bg-card"
            value={value.recurrence_type || "none"}
            onChange={(e) => update({ recurrence_type: e.target.value })}
          >
            {RECURRENCE_TYPES.map(r => (
              <option key={r.value} value={r.value}>{lang === "ar" ? r.ar : r.en}</option>
            ))}
          </select>
        </div>

        {value.recurrence_type && value.recurrence_type !== "none" && (
          <div>
            <Label className="text-xs">{t("كل (عدد)", "Every (interval)")}</Label>
            <Input
              type="number"
              min="1"
              max="12"
              className="w-full"
              value={value.recurrence_interval || 1}
              onChange={(e) => update({ recurrence_interval: parseInt(e.target.value) || 1 })}
            />
          </div>
        )}
      </div>

      {/* Weekly: day-of-week selector */}
      {value.recurrence_type === "weekly" && (
        <div>
          <Label className="text-xs">{t("أيام الأسبوع", "Days of Week")}</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  selectedDays.includes(d.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {lang === "ar" ? d.ar : d.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly: day of month */}
      {value.recurrence_type === "monthly" && (
        <div>
          <Label className="text-xs">{t("يوم الشهر", "Day of Month")}</Label>
          <Input
            type="number"
            min="1"
            max="31"
            className="w-full"
            value={value.recurrence_month_day || 1}
            onChange={(e) => update({ recurrence_month_day: parseInt(e.target.value) || 1 })}
          />
        </div>
      )}

      {/* End condition */}
      {value.recurrence_type && value.recurrence_type !== "none" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t("عدد الاجتماعات (اختياري)", "Count (optional)")}</Label>
            <Input
              type="number"
              min="1"
              placeholder="∞"
              className="w-full"
              value={value.recurrence_count || ""}
              onChange={(e) => update({ recurrence_count: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
          <div>
            <Label className="text-xs">{t("ينتهي في (اختياري)", "Until (optional)")}</Label>
            <Input
              type="date"
              className="w-full"
              value={value.recurrence_until ? value.recurrence_until.slice(0, 10) : ""}
              onChange={(e) => update({ recurrence_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
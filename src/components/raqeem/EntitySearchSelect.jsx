import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Building2, Check } from "lucide-react";
import { QATARI_ENTITIES, ENTITY_CATEGORIES, getEntitiesByCategory, findEntity } from "@/lib/qatariEntities";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Smart searchable entity dropdown.
 * Typing letters (Arabic or English) filters entities by fuzzy substring match
 * across name (ar/en), id, and category — e.g. typing "ص" shows الصحة, الاقتصاد, etc.
 *
 * Props:
 *   value: string (entity id)
 *   onChange: (id) => void
 *   placeholder?: string
 *   includeOther?: boolean — show "Other entity" option (value = "__other__")
 *   className?: string
 */
const OTHER_ID = "__other__";

// Normalize Arabic: unify alef variants, remove diacritics, strip tatweel/kashida
function normalizeAr(s) {
  if (!s) return "";
  return String(s)
    .replace(/[\u064B-\u065F\u0670]/g, "") // diacritics
    .replace(/\u0640/g, "") // tatweel
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

function scoreMatch(query, entity) {
  if (!query) return 0;
  const q = normalizeAr(query);
  if (!q) return 0;
  const ar = normalizeAr(entity.ar);
  const en = (entity.en || "").toLowerCase();
  const id = (entity.id || "").toLowerCase();
  const catAr = normalizeAr(ENTITY_CATEGORIES[entity.category]?.ar);
  const catEn = (ENTITY_CATEGORIES[entity.category]?.en || "").toLowerCase();

  let score = 0;
  // Exact prefix match is strongest
  if (ar.startsWith(q)) score = Math.max(score, 100);
  if (en.startsWith(q)) score = Math.max(score, 95);
  if (id.startsWith(q)) score = Math.max(score, 90);
  // Word-start match (any word in name starts with q)
  if (ar.split(" ").some((w) => w.startsWith(q))) score = Math.max(score, 85);
  if (en.split(" ").some((w) => w.startsWith(q))) score = Math.max(score, 80);
  // Substring match
  if (ar.includes(q)) score = Math.max(score, 70);
  if (en.includes(q)) score = Math.max(score, 65);
  if (id.includes(q)) score = Math.max(score, 60);
  if (catAr && catAr.includes(q)) score = Math.max(score, 50);
  if (catEn && catEn.includes(q)) score = Math.max(score, 45);
  // Single-char match: any entity whose name contains the letter (for "ص" → الصحة, الاقتصاد...)
  if (q.length === 1 && (ar.includes(q) || en.includes(q))) score = Math.max(score, 40);
  return score;
}

export default function EntitySearchSelect({
  value,
  onChange,
  placeholder,
  includeOther = false,
  otherLabel,
  className,
}) {
  const { t, lang } = useLanguage();
  const label = placeholder || t("ابحث أو اختر الجهة", "Search or select entity");
  const otherText = otherLabel || t("جهة أخرى غير مدرجة", "Other entity not listed");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(() => (value && value !== OTHER_ID ? findEntity(value) : null), [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset query when closed
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightIndex(0);
    }
  }, [open]);

  // Filtered + grouped results
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // No query → show all grouped
      return getEntitiesByCategory();
    }
    const scored = QATARI_ENTITIES.map((e) => ({ entity: e, score: scoreMatch(q, e) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const grouped = {};
    scored.forEach(({ entity }) => {
      if (!grouped[entity.category]) grouped[entity.category] = [];
      grouped[entity.category].push(entity);
    });
    return grouped;
  }, [query]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items = [];
    Object.entries(filtered).forEach(([catKey, entities]) => {
      entities.forEach((e) => items.push({ type: "entity", catKey, entity: e }));
    });
    if (includeOther && (!query.trim() || normalizeAr(otherText).includes(normalizeAr(query)))) {
      items.push({ type: "other" });
    }
    return items;
  }, [filtered, includeOther, query, otherText]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const selectEntity = (id) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[highlightIndex];
      if (item?.type === "entity") selectEntity(item.entity.id);
      else if (item?.type === "other") selectEntity(OTHER_ID);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlightIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const showOther = includeOther && (!query.trim() || normalizeAr(otherText).includes(normalizeAr(query)));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger / display */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-right transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          !selected && !value && "text-muted-foreground",
          open && "ring-2 ring-ring"
        )}
      >
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-right">
          {value === OTHER_ID
            ? otherText
            : selected
              ? (lang === "ar" ? selected.ar : selected.en)
              : label}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              selectEntity("");
            }}
            aria-label={t("إزالة الجهة المختارة", "Clear selected entity")}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </span>
        ) : (
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={t("ابحث عن جهة", "Search for an entity")}
              placeholder={t("اكتب للبحث...", "Type to search...")}
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {flatItems.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t("لا نتائج", "No results found")}
              </div>
            ) : (
              <>
                {Object.entries(filtered).map(([catKey, entities]) => {
                  const cat = ENTITY_CATEGORIES[catKey];
                  if (!cat || entities.length === 0) return null;
                  return (
                    <div key={catKey}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/20 sticky top-0">
                        {lang === "ar" ? cat.ar : cat.en}
                      </div>
                      {entities.map((entity) => {
                        const flatIdx = flatItems.findIndex((i) => i.type === "entity" && i.entity.id === entity.id);
                        const isActive = value === entity.id;
                        const isHighlight = flatIdx === highlightIndex;
                        return (
                          <button
                            key={entity.id}
                            type="button"
                            data-idx={flatIdx}
                            onClick={() => selectEntity(entity.id)}
                            onMouseEnter={() => setHighlightIndex(flatIdx)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm text-right transition-colors",
                              isHighlight ? "bg-primary/10" : "hover:bg-secondary/40",
                              isActive && "bg-primary/15"
                            )}
                          >
                            <span className="flex-1 truncate text-right">{entity.ar}</span>
                            <span className="text-xs text-muted-foreground truncate" dir="ltr">{entity.en}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {showOther && (
                  <button
                    type="button"
                    data-idx={flatItems.findIndex((i) => i.type === "other")}
                    onClick={() => selectEntity(OTHER_ID)}
                    onMouseEnter={() => setHighlightIndex(flatItems.findIndex((i) => i.type === "other"))}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-right border-t border-border transition-colors",
                      flatItems.findIndex((i) => i.type === "other") === highlightIndex ? "bg-primary/10" : "hover:bg-secondary/40",
                      value === OTHER_ID && "bg-primary/15"
                    )}
                  >
                    <span className="flex-1 text-right italic text-muted-foreground">{otherText}</span>
                    {value === OTHER_ID && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
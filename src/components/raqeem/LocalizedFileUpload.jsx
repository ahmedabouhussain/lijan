import React, { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

export default function LocalizedFileUpload({
  value,
  onChange,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg",
  label = "رفع المستند",
  uploadingLabel = "جارٍ الرفع...",
  chooseLabel = "اختر ملف",
  dropLabel = "اسحب الملف هنا أو اضغط للاختيار",
  onUpload,
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (onUpload) {
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    } else {
      onChange({ ...value, file_name: file.name, file_size: file.size, file_type: file.type });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const remove = () => {
    onChange({ ...value, file_url: "", file_name: "" });
  };

  if (value?.file_url || value?.file_name) {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/40 border border-border">
        <span className="truncate flex items-center gap-2 text-sm min-w-0">
          <FileText className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{value.file_name || "ملف مرفوع"}</span>
          {value.file_size > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              ({(value.file_size / 1024).toFixed(0)} KB)
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={remove}
          className="text-muted-foreground hover:text-destructive shrink-0 p-1 rounded hover:bg-destructive/5"
          aria-label="إزالة الملف"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex items-center justify-center gap-2 h-12 rounded-md border border-dashed cursor-pointer text-sm transition-colors ${
        dragOver ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-secondary/30 text-muted-foreground"
      }`}
    >
      {uploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>{uploadingLabel}</span>
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>{dropLabel}</span>
        </>
      )}
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  );
}
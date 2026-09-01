import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PenLine, Eraser, Type, Upload, Check } from "lucide-react";

export default function SignaturePad({ value, onChange, onSave, saving }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState(value?.image_url ? "drawn" : value?.text ? "typed" : "drawn");
  const [text, setText] = useState(value?.text || "");
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value?.image_url);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1F2023";
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [mode]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stop = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveDrawn = async () => {
    if (!hasDrawn) return;
    setUploading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "signature.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...value, image_url: file_url, text: undefined });
      setMode("drawn");
    } catch {}
    setUploading(false);
  };

  const applyTyped = () => {
    if (!text.trim()) return;
    onChange({ ...value, text: text.trim(), image_url: undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMode("drawn")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
            mode === "drawn" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <PenLine className="w-3.5 h-3.5" /> رسم
        </button>
        <button
          onClick={() => setMode("typed")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
            mode === "typed" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <Type className="w-3.5 h-3.5" /> كتابة
        </button>
      </div>

      {mode === "drawn" ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={500}
            height={160}
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={draw}
            onTouchEnd={stop}
            className="w-full h-32 border border-border rounded-md bg-background cursor-crosshair touch-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={clear}>
              <Eraser className="w-3.5 h-3.5" /> مسح
            </Button>
            <Button size="sm" onClick={saveDrawn} disabled={!hasDrawn || uploading}>
              {uploading ? "جارٍ الحفظ..." : "حفظ التوقيع المرسوم"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب اسمك للتوقيع"
            className="w-full px-3 py-2 text-2xl border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
          />
          <Button size="sm" onClick={applyTyped} disabled={!text.trim()}>
            <Check className="w-3.5 h-3.5" /> اعتماد التوقيع المكتوب
          </Button>
        </div>
      )}

      {/* Preview */}
      {(value?.image_url || value?.text) && (
        <div className="flex items-center justify-between gap-3 p-3 bg-secondary/40 rounded-md border border-border">
          <div className="text-xs text-muted-foreground">التوقيع الحالي:</div>
          {value?.image_url ? (
            <img src={value.image_url} alt="signature" className="h-12 object-contain" />
          ) : (
            <span className="text-2xl text-foreground" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>
              {value.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
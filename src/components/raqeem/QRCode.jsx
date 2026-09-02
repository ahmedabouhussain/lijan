import React from "react";
import { cn } from "@/lib/utils";

/**
 * QRCode — renders a QR code encoding the given value (typically a verification URL).
 * Uses the qrserver.com API — no client-side library needed.
 * Section 5: QR Verification.
 */
export default function QRCode({ value, size = 160, className, label }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=8A1538&bgcolor=FFFFFF`;
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="p-2 bg-white rounded-lg border border-border" style={{ width: size + 16, height: size + 16 }}>
        <img src={src} width={size} height={size} alt={label || "QR Code"} className="block" />
      </div>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}
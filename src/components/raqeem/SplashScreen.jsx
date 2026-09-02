import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BRAND_INTRO_VIDEO_URL,
  BRAND,
  BRAND_COLORS,
} from "@/lib/brand";
import PlatformBrandLogo from "@/components/brand/PlatformBrandLogo";
import { useLanguage } from "@/lib/LanguageContext";

// LIJAN splash: maroon intro video → brand reveal → fade to app.
// Phases: "video" → "reveal" → "exit". Tap anywhere to skip.
// Maroon background throughout; brand reveal is text-based (no white rectangle on maroon).
export default function SplashScreen({ onFinish }) {
  const { lang } = useLanguage();
  const [phase, setPhase] = useState("video");
  const phaseRef = useRef("video");
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const finish = useCallback(() => {
    if (phaseRef.current === "exit") return;
    phaseRef.current = "exit";
    clearTimers();
    setPhase("exit");
    timersRef.current.push(setTimeout(() => onFinish(), 700));
  }, [onFinish]);

  const revealBrand = useCallback(() => {
    if (phaseRef.current !== "video") return;
    phaseRef.current = "reveal";
    setPhase("reveal");
    timersRef.current.push(setTimeout(() => finish(), 1800));
  }, [finish]);

  useEffect(() => {
    // Safety: if video doesn't end in 6s, reveal brand anyway
    const safety = setTimeout(() => revealBrand(), 6000);
    timersRef.current.push(safety);
    return clearTimers;
  }, []);

  return (
    <div
      onClick={finish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-700 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: BRAND_COLORS.primary }}
    >
      {/* Intro video — plays first, fades out when it ends */}
      <video
        src={BRAND_INTRO_VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={revealBrand}
        onError={revealBrand}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
          phase === "video" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Brand reveal — official logo on white surface + tagline */}
      <div
        className={`relative z-10 flex flex-col items-center gap-5 px-8 transition-all duration-1000 ${
          phase === "reveal" ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <PlatformBrandLogo size="large" placement="sidebar" linked={false} />

        {/* Tagline */}
        <div
          className="text-[11px] sm:text-xs mt-1 tracking-wide"
          style={{ color: BRAND_COLORS.gold }}
        >
          {lang === "ar" ? BRAND.taglineAr : BRAND.taglineEn}
        </div>
      </div>

      {/* Skip hint — only during video phase */}
      <div
        className={`absolute bottom-6 sm:bottom-8 text-[11px] tracking-wider transition-opacity duration-500 ${
          phase === "video" ? "opacity-60" : "opacity-0"
        }`}
        style={{ color: BRAND_COLORS.gold }}
      >
        اضغط للتخطي · Tap to skip
      </div>
    </div>
  );
}
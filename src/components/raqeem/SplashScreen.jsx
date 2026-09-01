import React, { useState, useEffect, useRef, useCallback } from "react";
import { Image } from "@/components/ui/image";
import {
  BRAND_LOGO_URL,
  BRAND_INTRO_VIDEO_URL,
  BRAND_TAGLINE_AR,
  BRAND_TAGLINE_EN,
  BRAND_COLORS,
} from "@/lib/brand";
import { useLanguage } from "@/lib/LanguageContext";

// Apple-style splash screen: intro video → brand reveal → fade to app.
// Phases: "video" → "reveal" → "exit". Tap anywhere to skip.
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
      style={{ background: BRAND_COLORS.background }}
      dir="rtl"
    >
      {/* Intro video — plays first, fades out when it ends */}
      <video
        src={BRAND_INTRO_VIDEO_URL}
        autoPlay
        muted
        playsInline
        onEnded={revealBrand}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
          phase === "video" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Brand reveal — logo + tagline fade in after video */}
      <div
        className={`relative z-10 flex flex-col items-center gap-6 px-8 transition-all duration-1000 ${
          phase === "reveal" ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <Image
          src={BRAND_LOGO_URL}
          alt="رَقِيم · RAQEEM"
          fittingType="fit"
          className="w-40 h-40 sm:w-52 sm:h-52"
        />
        <div className="text-center">
          <div
            className="text-lg sm:text-xl font-medium tracking-wide"
            style={{ color: BRAND_COLORS.primary }}
          >
            {lang === "ar" ? BRAND_TAGLINE_AR : BRAND_TAGLINE_EN}
          </div>
          <div
            className="text-xs sm:text-sm mt-2.5 tracking-[0.3em] uppercase"
            style={{ color: BRAND_COLORS.gold }}
          >
            {lang === "ar" ? BRAND_TAGLINE_EN : BRAND_TAGLINE_AR}
          </div>
        </div>
      </div>

      {/* Skip hint — only during video phase */}
      <div
        className={`absolute bottom-6 sm:bottom-8 text-[11px] tracking-wider transition-opacity duration-500 ${
          phase === "video" ? "opacity-50" : "opacity-0"
        }`}
        style={{ color: BRAND_COLORS.gold }}
      >
        اضغط للتخطي · Tap to skip
      </div>
    </div>
  );
}
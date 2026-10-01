import { Stamp } from "lucide-react";

/**
 * أمين — the single unified institutional agent.
 * One agent, one identity; the active context selects the mode (state).
 */

export const AMEEN_AGENT_NAME = "ameen";
export const AMEEN_DISPLAY_NAME = "أمين";
export const AmeenIcon = Stamp;

export const AMEEN_MODES = {
  general: {
    mode: "general",
    subtitle: "أمين اللجنة الذكي",
    emptyHint: "اسأل عن الاجتماعات، الإجراءات، أو الذاكرة المؤسسية.",
  },
  meetings: {
    mode: "meetings",
    subtitle: "وضع الاجتماعات وبنود الأعمال",
    emptyHint: "اطلب عرض بنود جدول الأعمال أو صياغة مسودة قرار.",
  },
  actions: {
    mode: "actions",
    subtitle: "وضع متابعة الإجراءات والتنفيذ",
    emptyHint: "اطلب استعراض إجراءاتك المعلقة والمتأخرة.",
  },
  memory: {
    mode: "memory",
    subtitle: "وضع الذاكرة المؤسسية",
    emptyHint: "اسأل عن مبدأ مؤسسي أو قرار تاريخي أو سياق حوكمة سابق.",
  },
};

export function getAmeenMode(mode) {
  return AMEEN_MODES[mode] || AMEEN_MODES.general;
}
// Shared meeting-date label for the demonstration experience surfaces.
export function formatMeetingDate(value, lang) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
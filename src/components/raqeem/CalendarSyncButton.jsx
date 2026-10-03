import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Loader2, Check, Link2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

const CONNECTOR_ID = "6a40f423404d169cb3344836";

export default function CalendarSyncButton({ meetingId }) {
  const { t } = useLanguage();
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [syncResult, setSyncResult] = useState(null);

  const checkConnection = async () => {
    try {
      const res = await base44.functions.invoke("GetCalendarConnection", {});
      setConnected(res.data?.connected || false);
    } catch {
      setConnected(false);
    }
    setChecking(false);
  };

  useEffect(() => { checkConnection(); }, []);

  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkConnection();
        }
      }, 500);
    } catch (e) {
      console.error("Connect failed:", e);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("SyncMeetingToCalendar", { meeting_id: meetingId });
      setSyncResult(res.data);
    } catch (e) {
      console.error("Sync failed:", e);
    }
    setSyncing(false);
  };

  if (checking) {
    return <Button size="sm" variant="outline" disabled><Loader2 className="w-3.5 h-3.5 animate-spin" /></Button>;
  }

  if (!connected) {
    return (
      <Button size="sm" variant="outline" onClick={handleConnect}>
        <Link2 className="w-3.5 h-3.5" />
        {t("ربط Google Calendar", "Connect Google Calendar")}
      </Button>
    );
  }

  if (syncResult?.event_url) {
    return (
      <div className="flex items-center gap-2">
        <a href={syncResult.event_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            {syncResult.status === 'created' ? t("أُضيف للتقويم", "Added to calendar") : t("حُدّث في التقويم", "Updated in calendar")}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </a>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
      {t("مزامنة مع التقويم", "Sync to calendar")}
    </Button>
  );
}
import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export default function OfflineBanner({ queueCount = 0, syncing = false, lastSyncResult = null }) {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (syncing) {
    return (
      <div className="bg-blue-600 text-white text-xs text-center py-1 px-4 flex items-center justify-center gap-1">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing {queueCount} offline report{queueCount !== 1 ? "s" : ""}...
      </div>
    );
  }

  if (!offline && lastSyncResult?.success > 0) {
    return (
      <div className="bg-green-600 text-white text-xs text-center py-1 px-4 flex items-center justify-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {lastSyncResult.success} offline report{lastSyncResult.success !== 1 ? "s" : ""} synced successfully!
      </div>
    );
  }

  if (offline) {
    return (
      <div className="bg-yellow-500 text-white text-xs text-center py-1 px-4 flex items-center justify-center gap-1">
        <WifiOff className="w-3 h-3" />
        {queueCount > 0
          ? `Offline — ${queueCount} report${queueCount !== 1 ? "s" : ""} queued, will sync when connected`
          : "You are offline — reports will be saved and sent when connection is restored"}
      </div>
    );
  }

  if (queueCount > 0) {
    return (
      <div className="bg-yellow-500 text-white text-xs text-center py-1 px-4 flex items-center justify-center gap-1">
        <RefreshCw className="w-3 h-3" />
        {queueCount} report{queueCount !== 1 ? "s" : ""} pending sync...
      </div>
    );
  }

  return null;
}
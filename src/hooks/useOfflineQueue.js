import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const QUEUE_KEY = "assetwolf_offline_queue";

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState(loadQueue);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null); // { success, failed }
  const isSyncingRef = useRef(false);

  const refreshQueue = () => {
    setQueue(loadQueue());
  };

  const enqueue = useCallback((reportPayload) => {
    const item = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      queuedAt: new Date().toISOString(),
      payload: reportPayload,
    };
    const updated = [...loadQueue(), item];
    saveQueue(updated);
    setQueue(updated);
    return item.id;
  }, []);

  const removeFromQueue = useCallback((id) => {
    const updated = loadQueue().filter((i) => i.id !== id);
    saveQueue(updated);
    setQueue(updated);
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    const current = loadQueue();
    if (current.length === 0) return;

    isSyncingRef.current = true;
    setSyncing(true);

    let success = 0;
    let failed = 0;

    for (const item of current) {
      try {
        const { payload } = item;

        // Create the report entity
        const created = await base44.entities.Report.create({
          ...payload.reportData,
          isSent: false,
        });

        const reportLink = `${window.location.origin}/report/${created.id}`;

        // Send the email
        await base44.functions.invoke("sendAssetReport", {
          ...payload.emailData,
          reportId: created.id,
          reportLink,
        });

        // Mark as sent
        await base44.entities.Report.update(created.id, { isSent: true });

        removeFromQueue(item.id);
        success++;
      } catch {
        failed++;
      }
    }

    setLastSyncResult({ success, failed });
    setSyncing(false);
    isSyncingRef.current = false;
  }, [removeFromQueue]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  // Also try to sync on mount if online and queue has items
  useEffect(() => {
    if (navigator.onLine && loadQueue().length > 0) {
      syncQueue();
    }
  }, [syncQueue]);

  return {
    queue,
    syncing,
    lastSyncResult,
    enqueue,
    syncQueue,
    refreshQueue,
  };
}
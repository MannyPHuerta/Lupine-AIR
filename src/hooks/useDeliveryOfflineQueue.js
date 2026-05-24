import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const QUEUE_KEY = "lupine_delivery_offline_queue";

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

/**
 * Offline queue for delivery workflow actions.
 * 
 * Supported operation types:
 *   - "delivery_status"  : { deliveryId, updates }
 *   - "delivery_photos"  : { deliveryId, photos }
 *   - "delivery_signature": { deliveryId, signatureDataUrl, signedAt }
 *   - "rental_status"    : { rentalId, status }
 *   - "equipment_status" : { equipmentId, unitStatus }
 */
export function useDeliveryOfflineQueue() {
  const [queue, setQueue] = useState(loadQueue);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const isSyncingRef = useRef(false);

  // Track online/offline state — poll every 3s as fallback for cases where
  // the browser event fires late or not at all (e.g. DevTools offline mode)
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const poll = setInterval(() => {
      setIsOnline(navigator.onLine);
    }, 3000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(poll);
    };
  }, []);

  const enqueue = useCallback((type, data) => {
    const item = {
      id: `dq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      data,
      queuedAt: new Date().toISOString(),
      attempts: 0,
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
    if (isSyncingRef.current || !navigator.onLine) return;
    const current = loadQueue();
    if (current.length === 0) return;

    isSyncingRef.current = true;
    setSyncing(true);

    let success = 0;
    let failed = 0;

    for (const item of current) {
      try {
        const { type, data } = item;

        if (type === "delivery_status") {
          await base44.entities.Delivery.update(data.deliveryId, data.updates);
        } else if (type === "delivery_photos") {
          await base44.entities.Delivery.update(data.deliveryId, { photos: data.photos });
        } else if (type === "delivery_signature") {
          await base44.entities.Delivery.update(data.deliveryId, {
            signatureDataUrl: data.signatureDataUrl,
            signedAt: data.signedAt,
          });
        } else if (type === "rental_status") {
          await base44.entities.Rental.update(data.rentalId, { status: data.status });
        } else if (type === "equipment_status") {
          await base44.entities.Equipment.update(data.equipmentId, { unitStatus: data.unitStatus });
        }

        removeFromQueue(item.id);
        success++;
      } catch {
        // Increment attempt count but leave in queue
        const updated = loadQueue().map((i) =>
          i.id === item.id ? { ...i, attempts: (i.attempts || 0) + 1 } : i
        );
        saveQueue(updated);
        setQueue(updated);
        failed++;
      }
    }

    setLastSyncResult({ success, failed, syncedAt: new Date().toISOString() });
    setSyncing(false);
    isSyncingRef.current = false;
  }, [removeFromQueue]);

  // Auto-sync when back online
  useEffect(() => {
    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  // Sync on mount if online and queue has items
  useEffect(() => {
    if (navigator.onLine && loadQueue().length > 0) {
      syncQueue();
    }
  }, [syncQueue]);

  return {
    queue,
    syncing,
    isOnline,
    lastSyncResult,
    pendingCount: queue.length,
    enqueue,
    syncQueue,
  };
}
/**
 * useDLScanner — detects USB HID barcode scanner input (AAMVA PDF417)
 *
 * USB scanners appear as keyboards and fire an entire barcode in <150ms.
 * We capture all rapid keystrokes into a buffer, then parse when input stops.
 *
 * Key fixes vs previous version:
 *  - isScanningRef resets cleanly after each flush so the NEXT scan starts fresh.
 *  - The VERY FIRST character of a scan (often `@`) sets isScanningRef=true
 *    immediately, rather than being dropped as a "slow human key".
 *  - We detect scan start by: (a) speed, OR (b) the char is `@` (AAMVA SOF).
 */

import { useEffect, useRef, useCallback } from 'react';
import { parseDLBarcode } from '@/lib/parseDL';

// Honeywell/Zebra USB HID scanners emit ~1 char per 5-20ms
const SCANNER_SPEED_THRESHOLD_MS = 80;
// Wait this long after last char before parsing
const SCAN_END_DEBOUNCE_MS = 300;
// Minimum buffer length for a real DL barcode
const MIN_SCAN_LENGTH = 60;

// Global debug log accessible from browser console as window.__dlDebug
if (typeof window !== 'undefined') {
  window.__dlDebug = [];
}
function dlLog(...args) {
  console.log(...args);
  if (typeof window !== 'undefined') {
    window.__dlDebug.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    if (window.__dlDebug.length > 50) window.__dlDebug.shift();
  }
}

export function useDLScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);
  const isScanningRef = useRef(false);

  const flush = useCallback(() => {
    const raw = bufferRef.current;
    bufferRef.current = '';
    isScanningRef.current = false;
    lastKeyTimeRef.current = 0; // reset so next scan starts clean

    dlLog('[DLScanner] flush | len:', raw.length, '| preview:', JSON.stringify(raw.slice(0, 80)));

    if (raw.length < MIN_SCAN_LENGTH) {
      dlLog('[DLScanner] too short, skipping');
      return;
    }

    const parsed = parseDLBarcode(raw);
    dlLog('[DLScanner] parsed:', parsed);
    if (parsed && onScan) {
      onScan(parsed);
    }
  }, [onScan]);

  useEffect(() => {
    const handleKey = (e) => {
      // Skip non-printable keys (arrows, F-keys, etc.) except Enter/Tab which act as \n
      if (e.key.length !== 1 && e.key !== 'Enter' && e.key !== 'Tab') return;

      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const char = (e.key === 'Enter' || e.key === 'Tab') ? '\n' : e.key;

      // Start scanning if:
      //   (a) keystroke came very fast (scanner speed), OR
      //   (b) char is @ (AAMVA start-of-format byte) — always begin a new scan
      const isScanner = timeSinceLast < SCANNER_SPEED_THRESHOLD_MS;
      const isAamvaStart = char === '@';

      if (isAamvaStart) {
        // New scan starting — clear any stale buffer
        dlLog('[DLScanner] AAMVA @ detected — starting new buffer');
        if (timerRef.current) clearTimeout(timerRef.current);
        bufferRef.current = '@';
        isScanningRef.current = true;
        timerRef.current = setTimeout(flush, SCAN_END_DEBOUNCE_MS);
        return;
      }

      if (isScanner || isScanningRef.current) {
        isScanningRef.current = true;
        bufferRef.current += char;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, SCAN_END_DEBOUNCE_MS);
      }
      // Slow human keystrokes while NOT scanning are completely ignored
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);
}
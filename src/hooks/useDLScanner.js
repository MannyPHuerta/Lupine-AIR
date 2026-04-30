/**
 * useDLScanner — detects USB ID scanner input (AAMVA PDF417)
 *
 * USB HID scanners present as keyboards and "type" the barcode data
 * extremely fast (entire payload in <100ms). We detect this by:
 *   1. Watching for rapid keystrokes on the document
 *   2. Accumulating the buffer
 *   3. Parsing when input stops (debounced ~150ms)
 *
 * The hook fires onScan(parsedData) when a valid DL is detected.
 * It does NOT interfere with normal keyboard input.
 */

import { useEffect, useRef, useCallback } from 'react';
import { parseDLBarcode } from '@/lib/parseDL';

const SCANNER_SPEED_THRESHOLD_MS = 50; // scanners type faster than this per char
const SCAN_END_DEBOUNCE_MS = 150;       // wait this long after last char to parse
const MIN_SCAN_LENGTH = 100;            // real DL barcodes are long

export function useDLScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);
  const isScanningRef = useRef(false);

  const flush = useCallback(() => {
    const raw = bufferRef.current;
    bufferRef.current = '';
    isScanningRef.current = false;

    if (raw.length < MIN_SCAN_LENGTH) return;

    const parsed = parseDLBarcode(raw);
    if (parsed && onScan) {
      onScan(parsed);
    }
  }, [onScan]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If this keystroke came in very fast, it's likely a scanner
      if (timeSinceLast < SCANNER_SPEED_THRESHOLD_MS || isScanningRef.current) {
        // Don't accumulate if it's a normal modifier key
        if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Tab') {
          isScanningRef.current = true;
          bufferRef.current += e.key === 'Enter' || e.key === 'Tab' ? '\n' : e.key;

          // Reset debounce timer
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(flush, SCAN_END_DEBOUNCE_MS);
        }
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);
}
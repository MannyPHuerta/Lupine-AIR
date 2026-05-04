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

const SCANNER_SPEED_THRESHOLD_MS = 80; // Honeywell USB scanners can be ~50-80ms per char
const SCAN_END_DEBOUNCE_MS = 300;       // wait this long after last char to parse
const MIN_SCAN_LENGTH = 80;             // real DL barcodes are long

export function useDLScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timerRef = useRef(null);
  const isScanningRef = useRef(false);

  const flush = useCallback(() => {
    const raw = bufferRef.current;
    bufferRef.current = '';
    isScanningRef.current = false;

    console.log('[DLScanner] flush — buffer length:', raw.length, '| preview:', raw.slice(0, 60));

    if (raw.length < MIN_SCAN_LENGTH) {
      console.log('[DLScanner] too short, ignoring');
      return;
    }

    const parsed = parseDLBarcode(raw);
    console.log('[DLScanner] parsed:', parsed);
    if (parsed && onScan) {
      onScan(parsed);
    }
  }, [onScan]);

  useEffect(() => {
    const handleKey = (e) => {
      const now = Date.now();
      const timeSinceLast = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Only accumulate printable keys, Enter, and Tab
      if (e.key.length !== 1 && e.key !== 'Enter' && e.key !== 'Tab') return;

      const char = e.key === 'Enter' || e.key === 'Tab' ? '\n' : e.key;

      if (timeSinceLast < SCANNER_SPEED_THRESHOLD_MS || isScanningRef.current) {
        // Fast keystrokes — scanner input
        isScanningRef.current = true;
        bufferRef.current += char;

        // Reset debounce timer
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, SCAN_END_DEBOUNCE_MS);
      } else if (!isScanningRef.current) {
        // Slow (human) keystroke — seed the buffer; if next comes fast, we'll catch it
        bufferRef.current = char;
      }
    };

    // Use keydown — works with both modern browsers and Honeywell USB scanners
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);
}
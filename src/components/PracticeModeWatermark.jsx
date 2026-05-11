/**
 * PRACTICE MODE overlay watermark.
 * Drop this inside any page when practiceMode is true.
 * pointer-events: none so it never blocks clicks.
 */
export default function PracticeModeWatermark() {
  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Repeated diagonal text tiles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute whitespace-nowrap text-red-500 font-black opacity-10 text-4xl tracking-widest"
          style={{
            top: `${(i % 6) * 18 - 5}%`,
            left: `${Math.floor(i / 6) * 22 - 5}%`,
            transform: 'rotate(-35deg)',
          }}
        >
          PRACTICE MODE
        </div>
      ))}
      {/* Centered bold label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-red-500 font-black text-6xl opacity-15 tracking-widest"
          style={{ transform: 'rotate(-35deg)' }}
        >
          PRACTICE MODE
        </div>
      </div>
    </div>
  );
}
export default function Logo({ compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 shadow-[0_0_32px_rgba(34,211,238,0.22)]">
        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_45%)]" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.55)]">
          <span className="text-sm font-black text-cyan-300">DP</span>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-semibold tracking-tight text-white">DigitPrinters</span>
          <span className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Synthetic Markets</span>
        </div>
      )}
    </div>
  );
}

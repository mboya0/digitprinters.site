export default function LiveTicker({ symbols, tickData }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-lg shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/70">Live ticker</p>
          <h3 className="text-lg font-semibold text-white">Real time feed</h3>
        </div>
      </div>
      <div className="flex min-w-full flex-wrap gap-3">
        {symbols.slice(0, 10).map((symbol) => {
          const tick = tickData?.[symbol.symbol];
          const price = tick ? tick.quote ?? tick.bid ?? tick.ask : '--';
          const color = tick?.quoteTrending === 'up' ? 'text-emerald-400' : tick?.quoteTrending === 'down' ? 'text-red-400' : 'text-slate-300';
          return (
            <div key={symbol.symbol} className="min-w-[180px] rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{symbol.symbol}</p>
              <p className="mt-2 text-sm text-slate-300">{symbol.name}</p>
              <p className={`mt-3 text-xl font-semibold ${color}`}>{typeof price === 'number' ? price.toFixed(2) : price}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

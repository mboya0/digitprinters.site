export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="rounded-[2rem] border border-slate-700/80 bg-slate-900/90 p-12 shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Welcome to</p>
            <h1 className="mt-6 text-6xl font-black tracking-tight text-white sm:text-7xl">
              DigitPrinters
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Clean React + Vite foundation with Tailwind CSS configured and ready for
              development.
            </p>
            <div className="mt-10 inline-flex rounded-full bg-cyan-500/10 px-5 py-3 text-cyan-200 ring-1 ring-cyan-500/20">
              Dark mode interface • Tailwind CSS v3 • Vite + React
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

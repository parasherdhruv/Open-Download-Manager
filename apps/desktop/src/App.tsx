export function App() {
  return (
    <main className="shell-backdrop relative isolate flex min-h-screen overflow-hidden px-5 py-8 text-slate-100 sm:px-10 sm:py-12 lg:px-16">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-24 h-64 w-64 rounded-full border border-cyan-300/10 sm:h-80 sm:w-80"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full border border-indigo-300/10"
      />

      <div className="relative mx-auto flex w-full max-w-6xl items-center">
        <section
          aria-labelledby="application-title"
          className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 shadow-2xl shadow-black/40 backdrop-blur-sm"
        >
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/3 rounded-full bg-cyan-300/10 blur-3xl"
          />

          <header className="relative flex items-center gap-4 border-b border-white/10 px-6 py-5 sm:px-9">
            <div
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300 font-mono text-sm font-bold tracking-tight text-slate-950 shadow-lg shadow-cyan-950/30"
            >
              ODM
            </div>
            <p className="text-sm font-semibold tracking-[0.14em] text-slate-300 uppercase">
              Repository scaffold
            </p>
          </header>

          <div className="relative grid gap-10 px-6 py-10 sm:px-9 sm:py-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)] lg:items-center lg:gap-14 lg:px-14 lg:py-20">
            <div>
              <p className="mb-5 flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-cyan-300" />
                Pre-alpha desktop shell
              </p>
              <h1
                id="application-title"
                className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl"
              >
                Open Download Manager
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                This static interface verifies the desktop application boundary. It contains no
                product controls or sample data.
              </p>
            </div>

            <aside
              aria-labelledby="availability-title"
              className="rounded-3xl border border-cyan-200/15 bg-slate-950/70 p-6 shadow-xl shadow-black/20 sm:p-8"
            >
              <p
                id="availability-title"
                className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase"
              >
                Current availability
              </p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                Downloads are unavailable
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
                Download functionality is not implemented in this pre-alpha repository scaffold.
              </p>
            </aside>
          </div>

          <footer className="relative flex flex-col gap-2 border-t border-white/10 px-6 py-5 text-xs tracking-wide text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <p>Zero-feature build surface</p>
            <p>Local packaged assets only</p>
          </footer>
        </section>
      </div>
    </main>
  );
}

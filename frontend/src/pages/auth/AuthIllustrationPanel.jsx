function AuthIllustrationPanel({ badge, title, description, highlights }) {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 p-8 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="relative z-10">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{badge}</p>
        <h2 className="mt-5 text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-indigo-100">{description}</p>
      </div>

      <div className="relative z-10 mt-8 space-y-3">
        {highlights.map((highlight) => (
          <div key={highlight} className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <p className="text-sm font-medium">{highlight}</p>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 right-10 h-40 w-40 rounded-3xl border border-white/30 bg-white/10 backdrop-blur-sm" />
      <div className="pointer-events-none absolute left-10 top-28 h-24 w-24 rounded-full border border-white/40" />
    </aside>
  )
}

export default AuthIllustrationPanel


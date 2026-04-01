function UserSidebar({
  isSidebarExpanded,
  onCollapse,
  onExpand,
  onItemNavigate,
  onLogout,
  sidebarItems,
}) {
  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 md:flex ${
        isSidebarExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-2 px-2 py-2">
        <div className={`flex items-center gap-2 overflow-hidden ${isSidebarExpanded ? 'opacity-100' : 'justify-center'}`}>
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
            <span className="material-symbols-outlined text-base">school</span>
          </div>
          {isSidebarExpanded ? <span className="text-sm font-bold text-slate-900">Campus Hub</span> : null}
        </div>

        <button
          type="button"
          onClick={isSidebarExpanded ? onCollapse : onExpand}
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-outlined text-base">
            {isSidebarExpanded ? 'left_panel_close' : 'menu'}
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemNavigate(item)}
            className={`flex w-full items-center rounded-xl px-3 py-3 text-left transition ${
              item.active
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            } ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {isSidebarExpanded ? <span className="text-sm font-medium">{item.label}</span> : null}
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center rounded-xl px-3 py-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
            isSidebarExpanded ? 'gap-3' : 'justify-center'
          }`}
        >
          <span className="material-symbols-outlined">logout</span>
          {isSidebarExpanded ? <span className="text-sm font-medium">Sign Out</span> : null}
        </button>
      </div>
    </aside>
  )
}

export default UserSidebar


function UserProfileHero({ initials, loadingProfile, profile }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-28 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <div className="px-6 pb-6">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-indigo-100 text-xl font-bold text-indigo-700 shadow-sm">
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {loadingProfile ? 'Loading profile...' : profile.fullName}
              </h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {profile.role}
          </span>
        </div>
      </div>
    </section>
  )
}

export default UserProfileHero


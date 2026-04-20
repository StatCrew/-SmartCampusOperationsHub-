import { Link } from 'react-router-dom'
import { LOGO_URL } from '../../constants/branding'

const featureCards = [
  {
    title: 'Book Facilities Faster',
    description: 'Reserve lecture halls, labs, and meeting spaces with real-time availability.',
    icon: 'calendar_month',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: 'Track Requests End-to-End',
    description: 'Follow approvals, updates, and assignment progress in one place.',
    icon: 'pending_actions',
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'Smart Notifications',
    description: 'Get alerts for booking updates, ticket responses, and critical events.',
    icon: 'notifications_active',
    color: 'from-pink-500 to-pink-600',
  },
  {
    title: 'Role-Based Dashboards',
    description: 'Admins, users, and technicians each get the right tools and views.',
    icon: 'dashboard',
    color: 'from-blue-500 to-blue-600',
  },
]

function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          <Link to="/" className="flex items-center">
            <img
                src={LOGO_URL}
                alt="Smart Campus logo"
                className="h-20 w-auto rounded-lg object-contain md:h-24"
                loading="lazy"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
                to="/signin"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>


      <main>
        {/* Hero Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl leading-tight mb-6">
                Campus operations made simple
              </h1>
              <p className="text-lg text-slate-600 mb-8">
                One platform for bookings, resources, maintenance, and notifications. Built for modern campuses.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/signup"
                  className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/signin"
                  className="rounded-lg border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Live Overview</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600">Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-4">
                    <p className="text-xs text-slate-500 font-medium mb-2">Total Bookings</p>
                    <p className="text-3xl font-bold text-indigo-600">1,284</p>
                  </div>
                  <div className="rounded-lg bg-white p-4">
                    <p className="text-xs text-slate-500 font-medium mb-2">Active Tickets</p>
                    <p className="text-3xl font-bold text-slate-900">42</p>
                  </div>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-slate-500 font-medium mb-3">Resource Utilization</p>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{width: '72%'}} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">72% capacity</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white border-t border-slate-200">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">Key features</h2>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((feature) => (
                <div key={feature.title} className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 mb-4">
                    <span className="material-symbols-outlined text-indigo-600">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* CTA Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-indigo-600">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold text-white">Ready to transform your campus?</h2>
            <p className="mt-4 text-lg text-indigo-100">Join hundreds of institutions using Campus Hub</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/signup"
                className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-slate-50"
              >
                Start Free Trial
              </Link>
              <Link
                to="/signin"
                className="rounded-lg border-2 border-white text-white px-8 py-3 text-sm font-semibold transition hover:bg-white hover:text-indigo-600"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img src={LOGO_URL} alt="Smart Campus logo" className="h-10 w-auto rounded-md object-contain" loading="lazy" />
                  <span className="font-bold text-slate-900">Campus Hub</span>
                </div>
                <p className="text-sm text-slate-600">Simplifying campus operations for modern institutions.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Product</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><a href="#" className="hover:text-indigo-600">Features</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Company</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><a href="#" className="hover:text-indigo-600">About</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Blog</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Legal</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><a href="#" className="hover:text-indigo-600">Privacy</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Terms</a></li>
                  <li><a href="#" className="hover:text-indigo-600">Support</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-8 flex items-center justify-between">
              <p className="text-sm text-slate-600">© 2024 Campus Hub. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="#" className="text-slate-600 hover:text-indigo-600">Twitter</a>
                <a href="#" className="text-slate-600 hover:text-indigo-600">LinkedIn</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default HomePage;






# Smart Campus Frontend

React + Tailwind CSS frontend with role-based authentication and protected dashboards.

## Features

- Sign In and Sign Up pages
- Axios API integration for login/register
- Global authentication state with Context API
- Route protection and role-based authorization
- Dashboard redirects for `USER`, `ADMIN`, and `TECHNICIAN`
- Automatic JWT attachment through Axios interceptor
- Logout support and basic form/error validation

## Folder Structure

```text
src/
  api/
	authService.js
  context/
	AuthContext.jsx
  pages/
	auth/
	  SignIn.jsx
	  SignUp.jsx
	dashboard/
	  AdminDashboard.jsx
	  DashboardLayout.jsx
	  TechnicianDashboard.jsx
	  UserDashboard.jsx
  routes/
	AppRoutes.jsx
	ProtectedRoute.jsx
  components/
	App.jsx
  main.jsx
```

## Environment Variables

The frontend reads env vars from the project root `.env` file.

```env
BACKEND_API_URL=http://localhost:8080
VITE_AUTH_PREFIX=/api/v1/auth
VITE_GOOGLE_AUTH_PATH=/oauth2/authorization/google
FRONTEND_OAUTH_SUCCESS_URL=http://localhost:5173/oauth/callback
```

## Run

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

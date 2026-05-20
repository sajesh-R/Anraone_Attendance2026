import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Layout ────────────────────────────────────────────────────
import Sidebar from './components/Sidebar';

// ── Pages ─────────────────────────────────────────────────────
import Login    from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile  from './pages/Profile';
import RoleSelection from './pages/RoleSelection';
import Attendance from './pages/Attendance';
import ClockIn from './pages/ClockIn';
import Leave from './pages/Leave';
import Overtime from './pages/Overtime';
import Regularization from './pages/Regularization';
import AuditTrail from './pages/AuditTrail';
import Employees from './pages/Employees';
import Reports from './pages/Reports';


/**
 * ProtectedRoute — Blocks unauthenticated sessions.
 * Optionally accepts `allowedRoles` for role-based gating.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/select-role" replace />;
  }

  // Role-based gating
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * DashboardLayout — Sidebar + main content shell
 */
const DashboardLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Portals */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-role" element={<RoleSelection />} />

          {/* Protected Workspace Pages */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Attendance />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Leave />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/overtime"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Overtime />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/regularization"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Regularization />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AuditTrail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clock-in"

            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ClockIn />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <Employees />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Wildcard fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
export { ProtectedRoute, DashboardLayout };


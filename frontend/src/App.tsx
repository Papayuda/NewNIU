import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BatteryPage from './pages/BatteryPage';
import MotorPage from './pages/MotorPage';
import LocationPage from './pages/LocationPage';
import TripsPage from './pages/TripsPage';
import FirmwarePage from './pages/FirmwarePage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { authenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/battery"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BatteryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/motor"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MotorPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/location"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LocationPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TripsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/firmware"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FirmwarePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LoadingSpinner from './components/LoadingSpinner';
import { lazy, Suspense, type ReactNode } from 'react';

const BatteryPage = lazy(() => import('./pages/BatteryPage'));
const MotorPage = lazy(() => import('./pages/MotorPage'));
const LocationPage = lazy(() => import('./pages/LocationPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const FirmwarePage = lazy(() => import('./pages/FirmwarePage'));
const LightingPage = lazy(() => import('./pages/LightingPage'));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <LoadingSpinner />
      </div>
    );
  }
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 pb-20 md:pb-0 p-4 md:p-8">
        <Suspense fallback={<LoadingSpinner />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <LoadingSpinner />
      </div>
    );
  }

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
      <Route
        path="/lighting"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LightingPage />
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

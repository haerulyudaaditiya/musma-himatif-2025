import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import RegisterPage from './pages/RegisterPage';
import TicketPage from './pages/TicketPage';
import VotePage from './pages/VotePage';
import QuickCountPage from './pages/QuickCountPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminConfigPage from './pages/AdminConfigPage';
import ScanPage from './pages/ScanPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminCandidatesPage from './pages/AdminCandidatesPage';

// Protected Route untuk halaman yang butuh login user
const UserProtectedRoute = ({ children }) => {
  const nim = localStorage.getItem('musma_nim');
  return nim ? children : <Navigate to="/" replace />;
};

// Protected Route untuk halaman admin
const AdminProtectedRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('musma_admin_session');
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#EF4444',
              },
            },
            loading: {
              style: {
                background: '#6B7280',
              },
            },
          }}
        />

        <Routes>
          {/* Root langsung ke register */}
          <Route path="/" element={<Navigate to="/register" replace />} />

          {/* Public Routes */}
          <Route path="/register" element={<RegisterPage />} />

          {/* User Protected Routes */}
          <Route
            path="/ticket"
            element={
              <UserProtectedRoute>
                <TicketPage />
              </UserProtectedRoute>
            }
          />

          <Route
            path="/vote"
            element={
              <UserProtectedRoute>
                <VotePage />
              </UserProtectedRoute>
            }
          />

          <Route path="/results" element={<QuickCountPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/config"
            element={
              <AdminProtectedRoute>
                <AdminConfigPage />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/scan"
            element={
              <AdminProtectedRoute>
                <ScanPage />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/candidates"
            element={
              <AdminProtectedRoute>
                <AdminCandidatesPage />
              </AdminProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

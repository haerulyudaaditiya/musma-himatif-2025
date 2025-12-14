import { Home, Shield, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../libs/toast';

export default function Header() {
  const navigate = useNavigate();

  // Cek status login
  const isUserLoggedIn = localStorage.getItem('musma_nim');
  const isAdminLoggedIn = localStorage.getItem('musma_admin_session');

  const handleUserLogout = () => {
    localStorage.removeItem('musma_nim');
    localStorage.removeItem('musma_nama');
    localStorage.removeItem('musma_kelas');
    showToast.info('Anda telah logout');
    navigate('/');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('musma_admin_session');
    localStorage.removeItem('musma_admin_name');
    showToast.info('Admin session ended');
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                MUSMA HIMATIF 2025
              </h1>
              <p className="text-xs text-gray-500 -mt-0.5">UBP Karawang</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* USER SUDAH LOGIN - Tampilkan button Logout */}
            {isUserLoggedIn && !isAdminLoggedIn && (
              <button
                onClick={handleUserLogout}
                className="btn btn-outline btn-sm gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

            {/* ADMIN SUDAH LOGIN - Tampilkan button Logout Admin */}
            {isAdminLoggedIn && (
              <button
                onClick={handleAdminLogout}
                className="btn btn-outline btn-sm gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout Admin</span>
              </button>
            )}

            {/* BELUM LOGIN - Tampilkan button Home dan Admin seperti semula */}
            {!isUserLoggedIn && !isAdminLoggedIn && (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <Home size={16} />
                  <span className="hidden sm:inline">Home</span>
                </button>

                <button
                  onClick={() => navigate('/admin/login')}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <Shield size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

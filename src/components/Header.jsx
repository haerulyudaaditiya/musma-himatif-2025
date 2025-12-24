import {
  Home,
  Shield,
  LogOut,
  User,
  ChevronDown,
  Ticket,
  Vote,
  BarChart3,
  QrCode,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../libs/toast';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutType, setLogoutType] = useState(''); // 'user' or 'admin'

  const userDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);

  // Cek status login
  const isUserLoggedIn = localStorage.getItem('musma_nim');
  const isAdminLoggedIn = localStorage.getItem('musma_admin_token');
  const userName = localStorage.getItem('musma_nama') || 'User';
  const adminName = localStorage.getItem('musma_admin_name') || 'Admin';

  const handleLogoutClick = (type) => {
    setLogoutType(type);
    setShowLogoutModal(true);
    setShowUserDropdown(false);
    setShowAdminDropdown(false);
  };

  const confirmLogout = () => {
    if (logoutType === 'user') {
      localStorage.removeItem('musma_nim');
      localStorage.removeItem('musma_nama');
      localStorage.removeItem('musma_kelas');
      showToast.success('Berhasil logout dari akun peserta');
      navigate('/');
    } else if (logoutType === 'admin') {
      localStorage.removeItem('musma_admin_token');
      localStorage.removeItem('musma_admin_name');
      showToast.success('Berhasil logout dari admin panel');
      navigate('/admin/login');
    }
    setShowLogoutModal(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(event.target)
      ) {
        setShowAdminDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
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

            {/* Desktop Navigation */}
            <div className="flex items-center gap-4">
              {/* User Logged In - Dropdown */}
              {isUserLoggedIn && !isAdminLoggedIn && (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <span className="font-medium">
                      {userName.split(' ')[0]}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        showUserDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-900 truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-500">Peserta</p>
                      </div>

                      <button
                        onClick={() => {
                          navigate('/ticket');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Tiket Saya
                      </button>

                      <button
                        onClick={() => {
                          navigate('/vote');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Voting
                      </button>

                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={() => handleLogoutClick('user')}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Logged In - Dropdown */}
              {isAdminLoggedIn && (
                <div className="relative" ref={adminDropdownRef}>
                  <button
                    onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <span className="font-medium">{adminName}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        showAdminDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showAdminDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-900 truncate">
                          {adminName}
                        </p>
                        <p className="text-xs text-gray-500">Admin Panel</p>
                      </div>

                      <button
                        onClick={() => {
                          navigate('/admin/profile');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Profil Saya
                      </button>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          navigate('/admin/dashboard');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Dashboard
                      </button>

                      <button
                        onClick={() => {
                          navigate('/admin/scan');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Scan Presensi
                      </button>

                      <button
                        onClick={() => {
                          navigate('/admin/config');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Konfigurasi
                      </button>

                      <button
                        onClick={() => {
                          navigate('/admin/candidates');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Kelola Kandidat
                      </button>

                      <button
                        onClick={() => {
                          navigate('/results');
                          setShowAdminDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        Quick Count
                      </button>

                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={() => handleLogoutClick('admin')}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Logout Admin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Not Logged In - Simple Buttons */}
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
                    className="btn btn-ghost btn-sm gap-2"
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Logout</h3>
                  <p className="text-sm text-gray-600">
                    {logoutType === 'user'
                      ? 'Keluar dari akun peserta?'
                      : 'Keluar dari admin panel?'}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700">
                  Anda harus login kembali untuk mengakses halaman{' '}
                  {logoutType === 'user' ? 'peserta' : 'admin'}.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

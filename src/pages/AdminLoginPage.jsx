import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  Lock,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'username':
        if (!value.trim()) error = 'Username harus diisi';
        else if (value.length < 3) error = 'Username minimal 3 karakter';
        break;

      case 'password':
        if (!value.trim()) error = 'Password harus diisi';
        else if (value.length < 6) error = 'Password minimal 6 karakter';
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Final validation
    const newErrors = {
      username: validateField('username', credentials.username),
      password: validateField('password', credentials.password),
    };

    setErrors(newErrors);

    if (newErrors.username || newErrors.password) {
      showToast.error('Harap perbaiki data yang dimasukkan');
      return;
    }

    setLoading(true);

    try {
      // Cek ke Database - dengan hash password nanti
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', credentials.username)
        .eq('password', credentials.password) // TODO: Ganti dengan hash
        .single();

      if (error || !data) {
        throw new Error('Username atau Password salah!');
      }

      // Login Sukses
      localStorage.setItem('musma_admin_session', 'true');
      localStorage.setItem('musma_admin_name', data.name || data.username);

      showToast.success(`Selamat datang, ${data.name || 'Admin'}!`);
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      showToast.error(error.message || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Admin Panel MUSMA
          </h1>
          <p className="text-gray-600">
            Himpunan Mahasiswa Teknik Informatika - UBP Karawang
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Masuk sebagai Admin
            </h2>
            <p className="text-gray-600 mb-8">
              Gunakan kredensial yang diberikan panitia
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Field */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="admin"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={credentials.username}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={credentials.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Security Note */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    <strong>Keamanan:</strong> Hanya panitia yang berwenang yang
                    dapat mengakses halaman ini.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading || !credentials.username || !credentials.password
                }
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </div>
                ) : (
                  <>
                    Masuk ke Dashboard Admin
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Home */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/')}
                className="text-blue-600 hover:text-blue-800 font-medium w-full text-center"
              >
                ← Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Untuk masalah teknis, hubungi koordinator IT
          </p>
          <p className="text-xs text-gray-500 mt-1">
            © 2024 HIMATIF UBP Karawang - All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  User,
  Shield,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Lock,
  Hash,
  Calendar,
  X,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Sesuai struktur tabel: username, name, role, password_hash, status
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Inline validation saat input berubah
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'username':
        if (!value.trim()) {
          error = 'Username harus diisi';
        } else if (value.length < 3) {
          error = 'Username minimal 3 karakter';
        } else if (value.length > 50) {
          error = 'Username maksimal 50 karakter';
        }
        break;

      case 'name':
        if (!value.trim()) {
          error = 'Nama harus diisi';
        } else if (value.length > 100) {
          error = 'Nama maksimal 100 karakter';
        }
        break;

      case 'currentPassword':
        if (formData.newPassword || formData.confirmPassword) {
          if (!value.trim()) {
            error = 'Password saat ini harus diisi untuk mengubah password';
          }
        }
        break;

      case 'newPassword':
        if (value && value.length < 6) {
          error = 'Password baru minimal 6 karakter';
        }
        break;

      case 'confirmPassword':
        if (value && value !== formData.newPassword) {
          error = 'Password konfirmasi tidak cocok';
        }
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validasi langsung
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));

    // Validasi tambahan untuk confirm password
    if (name === 'newPassword' && formData.confirmPassword) {
      const confirmError = validateField(
        'confirmPassword',
        formData.confirmPassword
      );
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // Cek session admin
  useEffect(() => {
    const isAdmin = localStorage.getItem('musma_admin_session');
    const adminId = localStorage.getItem('musma_admin_id');

    if (!isAdmin || !adminId) {
      showToast.error('Akses ditolak. Harap login sebagai admin.');
      navigate('/admin/login');
      return;
    }

    fetchAdminProfile(adminId);
  }, [navigate]);

  const fetchAdminProfile = async (adminId) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('admins')
        .select('username, name, role, status, created_at')
        .eq('id', adminId)
        .single();

      if (error) throw error;

      setFormData({
        username: data.username || '',
        name: data.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      showToast.error('Gagal memuat data profil');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validasi semua field
    Object.keys(formData).forEach((key) => {
      if (
        key !== 'currentPassword' &&
        key !== 'newPassword' &&
        key !== 'confirmPassword'
      ) {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    // Validasi password hanya jika ada yang diisi
    const isChangingPassword =
      formData.newPassword ||
      formData.confirmPassword ||
      formData.currentPassword;

    if (isChangingPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword =
          'Password saat ini harus diisi untuk mengubah password';
      }

      if (formData.newPassword && formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password baru minimal 6 karakter';
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Password konfirmasi tidak cocok';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast.error('Harap perbaiki data yang dimasukkan');
      return;
    }

    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    setShowSaveModal(false);
    setSaving(true);

    try {
      const adminId = localStorage.getItem('musma_admin_id');

      // Data yang akan diupdate sesuai struktur tabel
      const updateData = {
        username: formData.username.trim(),
        name: formData.name.trim(),
        updated_at: new Date().toISOString(),
      };

      // Update password jika ada perubahan
      if (formData.newPassword && formData.currentPassword) {
        // Verifikasi password lama
        const { data: adminData } = await supabase
          .from('admins')
          .select('password_hash')
          .eq('id', adminId)
          .single();

        if (adminData) {
          // Import bcrypt
          const bcrypt = (await import('bcryptjs')).default;
          const isValid = await bcrypt.compare(
            formData.currentPassword,
            adminData.password_hash
          );

          if (!isValid) {
            throw new Error('Password saat ini salah');
          }

          // Hash password baru
          // eslint-disable-next-line no-unused-vars
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(formData.newPassword, 10);
          updateData.password_hash = hashedPassword;
        }
      }

      // Update ke database
      const { error } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', adminId);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Username sudah digunakan');
        }
        throw error;
      }

      // Update localStorage
      localStorage.setItem('musma_admin_name', formData.name);

      showToast.success('Profil berhasil diperbarui');

      // Reset form password
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast.error(error.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('musma_admin_session');
    localStorage.removeItem('musma_admin_id');
    localStorage.removeItem('musma_admin_name');
    localStorage.removeItem('musma_admin_role');
    showToast.info('Berhasil logout');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat profil admin...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Pengaturan Profil Admin
                </h1>
                <p className="text-gray-600">Kelola data akun Anda</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="font-bold text-gray-900 text-lg">
                    Informasi Profil
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Sesuai struktur tabel admins
                  </p>
                </div>

                <form onSubmit={handleSaveClick} className="p-6">
                  {/* Username */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Username *
                        <span className="text-xs text-gray-500">
                          (unik, untuk login)
                        </span>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                        errors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Username"
                    />
                    {errors.username && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.username}
                      </p>
                    )}
                  </div>

                  {/* Name */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nama Lengkap *
                        <span className="text-xs text-gray-500">
                          (maks. 100 karakter)
                        </span>
                      </div>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nama lengkap"
                      maxLength={100}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {formData.name.length}/100 karakter
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                      Ubah Password
                    </h3>

                    <div className="space-y-6">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password Saat Ini
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12 ${
                              errors.currentPassword
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            placeholder="Masukkan password saat ini"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {errors.currentPassword && (
                          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.currentPassword}
                          </p>
                        )}
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password Baru
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12 ${
                              errors.newPassword
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            placeholder="Minimal 6 karakter"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {errors.newPassword && (
                          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.newPassword}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Konfirmasi Password Baru
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12 ${
                              errors.confirmPassword
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            placeholder="Ulangi password baru"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-10">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Simpan Perubahan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="space-y-6">
              {/* Account Info */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Informasi Akun
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500">Role</div>
                    <div className="font-medium text-gray-900">
                      Admin
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Default
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">ID Admin</div>
                    <div className="font-mono text-sm text-gray-700">
                      {localStorage.getItem('musma_admin_id')?.substring(0, 8)}
                      ...
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Aktif
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Terdaftar</div>
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      {new Date().toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan Penting */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-3">
                  Catatan Penting
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0"></div>
                    <span>
                      Username harus unik (tidak boleh sama dengan admin lain)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0"></div>
                    <span>Password di-hash dengan bcrypt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0"></div>
                    <span>Role tidak bisa diubah dari halaman ini</span>
                  </li>
                </ul>
              </div>

              {/* Logout Card */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-3">Keluar Akun</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Anda akan logout dari semua perangkat
                </p>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Simpan</h3>
                  <p className="text-sm text-gray-600">
                    Simpan perubahan profil?
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700">
                  Pastikan data yang Anda masukkan sudah benar. Perubahan tidak
                  dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveConfirm}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Ya, Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    Keluar dari admin panel?
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700">
                  Anda harus login kembali untuk mengakses halaman admin.
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
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

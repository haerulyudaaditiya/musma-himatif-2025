import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  Settings,
  Save,
  Clock,
  Calendar,
  Lock,
  Unlock,
  ArrowLeft,
  Bell,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminConfigPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_config')
        .select('*')
        .order('id');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching config:', error);
      showToast.error('Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cek session admin
  useEffect(() => {
    const isAdmin = localStorage.getItem('musma_admin_session');
    if (!isAdmin) {
      showToast.error('Akses ditolak. Harap login sebagai admin.');
      navigate('/admin/login');
      return;
    }

    fetchConfigs();
  }, [navigate, fetchConfigs]);

  const handleChange = (id, value) => {
    setConfigs(
      configs.map((config) =>
        config.id === id
          ? { ...config, config_value: value, updated_at: new Date() }
          : config
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      showToast.info('Tidak ada perubahan yang perlu disimpan');
      return;
    }

    setSaving(true);

    try {
      // LOGIKA UPDATE SAJA (bukan UPSERT)
      // 1. Filter hanya config yang ada ID-nya (sudah di database)
      const validConfigs = configs.filter((config) => config.id);

      if (validConfigs.length === 0) {
        throw new Error('Tidak ada konfigurasi valid untuk diperbarui');
      }

      // 2. Update satu per satu atau batch
      const updatePromises = validConfigs.map(
        (config) =>
          supabase
            .from('event_config')
            .update({
              config_value: config.config_value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', config.id) // ← PENTING: Pastikan WHERE clause ada
      );

      // 3. Eksekusi semua update
      const results = await Promise.all(updatePromises);

      // 4. Cek error
      const hasError = results.some((result) => result.error);
      if (hasError) {
        throw new Error('Beberapa konfigurasi gagal disimpan');
      }

      showToast.success(
        `${validConfigs.length} konfigurasi berhasil diperbarui!`
      );
      setHasChanges(false);

      // 5. Refresh data
      await fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);

      // Pesan error yang lebih jelas
      let errorMessage = 'Gagal menyimpan konfigurasi';
      if (error.message.includes('row-level security')) {
        errorMessage = 'Izin ditolak oleh database';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Anda tidak memiliki izin UPDATE';
      } else {
        errorMessage = error.message;
      }

      showToast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = () => {
    setShowResetModal(true);
  };

  const handleReset = () => {
    fetchConfigs();
    setHasChanges(false);
    setShowResetModal(false);
    showToast.info('Pengaturan direset ke nilai default');
  };

  const getCurrentStatus = () => {
    const eventDate = configs.find(
      (c) => c.config_key === 'event_date'
    )?.config_value;
    const votingStart = configs.find(
      (c) => c.config_key === 'voting_start'
    )?.config_value;
    const votingEnd = configs.find(
      (c) => c.config_key === 'voting_end'
    )?.config_value;
    const allowVoting =
      configs.find((c) => c.config_key === 'allow_voting')?.config_value ===
      'true';

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    let status = 'unknown';
    let statusMessage = 'Status belum terdeteksi';

    if (eventDate && votingStart && votingEnd) {
      if (!allowVoting) {
        status = 'disabled';
        statusMessage = 'Voting dinonaktifkan';
      } else if (currentDate !== eventDate) {
        status = 'wrong_date';
        statusMessage = `Hari ini bukan ${eventDate}`;
      } else if (currentTime < votingStart) {
        status = 'too_early';
        statusMessage = `Voting dibuka ${votingStart}`;
      } else if (currentTime > votingEnd) {
        status = 'too_late';
        statusMessage = `Voting ditutup ${votingEnd}`;
      } else {
        status = 'active';
        statusMessage = 'Voting sedang berlangsung';
      }
    }

    return {
      eventDate,
      votingStart,
      votingEnd,
      allowVoting,
      currentTime,
      currentDate,
      status,
      statusMessage,
    };
  };

  const status = getCurrentStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat konfigurasi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  Konfigurasi Waktu Acara
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Atur jadwal presensi dan voting
                </p>
              </div>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <button
                onClick={handleResetConfirm}
                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-3 sm:px-6 py-2 rounded-lg font-medium transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                  hasChanges
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Simpan Perubahan</span>
                <span className="sm:hidden">Simpan</span>
              </button>
            </div>
          </div>

          {/* Status Current */}
          <div className="bg-white rounded-xl sm:rounded-xl shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-8">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              Status Sistem Saat Ini
            </h3>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {/* Status Card */}
              <div
                className={`p-4 sm:p-5 rounded-lg border ${
                  status.status === 'active'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    : status.status === 'disabled'
                      ? 'bg-gradient-to-r from-red-50 to-red-50 border-red-200'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {status.status === 'active' ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  ) : status.status === 'disabled' ? (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  )}
                  <div>
                    <div className="font-bold text-base sm:text-lg">
                      {status.status === 'active'
                        ? 'Sistem Aktif'
                        : status.status === 'disabled'
                          ? 'Sistem Dinonaktifkan'
                          : 'Sistem Menunggu'}
                    </div>
                    <div className="text-xs sm:text-sm opacity-80">
                      {status.statusMessage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Info */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-gray-600 text-xs sm:text-sm">
                    Waktu Server
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-base">
                    {status.currentDate} {status.currentTime}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-gray-600 text-xs sm:text-sm">
                    Status Voting
                  </div>
                  <div
                    className={`font-bold ${status.allowVoting ? 'text-green-600' : 'text-red-600'} text-xs sm:text-base`}
                  >
                    {status.allowVoting ? 'DIJALANKAN' : 'DIMATIKAN'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Config Cards */}
          <div className="space-y-4 sm:space-y-6">
            {/* Date Configuration */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  Pengaturan Tanggal
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Atur tanggal pelaksanaan acara
                </p>
              </div>
              <div className="p-4 sm:p-6">
                {configs
                  .filter((c) => c.config_key === 'event_date')
                  .map((config) => (
                    <div
                      key={config.id}
                      className="flex flex-col md:grid md:grid-cols-3 gap-4 sm:gap-6 items-center"
                    >
                      <div>
                        <label className="block font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                          {config.label}
                        </label>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {config.description}
                        </p>
                      </div>
                      <div>
                        <input
                          type="date"
                          value={config.config_value}
                          onChange={(e) =>
                            handleChange(config.id, e.target.value)
                          }
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        />
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        <div className="font-medium">Format: YYYY-MM-DD</div>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded mt-1 ${config.config_value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {config.config_value
                            ? 'Tanggal diatur'
                            : 'Belum diatur'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Time Configuration */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  Pengaturan Waktu
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Atur jam operasional sistem
                </p>
              </div>
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {configs
                  .filter(
                    (c) =>
                      c.config_key.includes('_start') ||
                      c.config_key.includes('_end')
                  )
                  .map((config) => (
                    <div
                      key={config.id}
                      className="flex flex-col md:grid md:grid-cols-3 gap-4 sm:gap-6 items-center"
                    >
                      <div>
                        <label className="block font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                          {config.label}
                        </label>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {config.description}
                        </p>
                      </div>
                      <div>
                        <input
                          type="time"
                          value={config.config_value}
                          onChange={(e) =>
                            handleChange(config.id, e.target.value)
                          }
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        />
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        <div className="font-medium">
                          Format: HH:MM (24 jam)
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded mt-1 bg-blue-100 text-blue-800">
                          {config.config_key.includes('voting')
                            ? 'Voting'
                            : 'Presensi'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* System Configuration */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  Pengaturan Sistem
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Kontrol fitur dan akses
                </p>
              </div>
              <div className="p-4 sm:p-6">
                {configs
                  .filter((c) => c.config_key.includes('allow_'))
                  .map((config) => (
                    <div
                      key={config.id}
                      className="flex flex-col md:grid md:grid-cols-3 gap-4 sm:gap-6 items-center"
                    >
                      <div>
                        <label className="block font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                          {config.label}
                        </label>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {config.description}
                        </p>
                      </div>
                      <div>
                        <select
                          value={config.config_value}
                          onChange={(e) =>
                            handleChange(config.id, e.target.value)
                          }
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        >
                          <option value="true">Aktifkan</option>
                          <option value="false">Nonaktifkan</option>
                        </select>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        <div className="font-medium">Status Saat Ini</div>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded mt-1 ${config.config_value === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {config.config_value === 'true' ? (
                            <>Diaktifkan</>
                          ) : (
                            <>Dinonaktifkan</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Tambahkan ini setelah System Configuration */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden mt-4 sm:mt-6">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                Pengaturan Tampilan
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Atur informasi yang ditampilkan ke peserta
              </p>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {configs
                .filter(
                  (c) =>
                    c.config_key.includes('_display') ||
                    c.config_key.includes('location') ||
                    c.config_key.includes('contact_')
                )
                .map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-col md:grid md:grid-cols-3 gap-4 sm:gap-6 items-center"
                  >
                    <div>
                      <label className="block font-medium text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">
                        {config.label}
                      </label>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {config.description}
                      </p>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={config.config_value}
                        onChange={(e) =>
                          handleChange(config.id, e.target.value)
                        }
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        placeholder={`Masukkan ${config.label}`}
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      <div className="font-medium">
                        Tipe: Informasi Tampilan
                      </div>
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded mt-1 bg-purple-100 text-purple-800">
                        {config.config_key.includes('display')
                          ? 'Display'
                          : config.config_key.includes('contact')
                            ? 'Kontak'
                            : 'Lokasi'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
              Ringkasan Konfigurasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xs sm:text-sm text-gray-600">
                  Jadwal Voting
                </div>
                <div className="font-bold text-sm sm:text-base">
                  {status.votingStart && status.votingEnd
                    ? `${status.votingStart} - ${status.votingEnd}`
                    : 'Belum diatur'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600">
                  Sistem Voting
                </div>
                <div
                  className={`font-bold ${status.allowVoting ? 'text-green-600' : 'text-red-600'} text-sm sm:text-base`}
                >
                  {status.allowVoting ? 'AKTIF' : 'NONAKTIF'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600">
                  Perubahan Belum Disimpan
                </div>
                <div
                  className={`font-bold ${hasChanges ? 'text-amber-600' : 'text-gray-600'} text-sm sm:text-base`}
                >
                  {hasChanges ? 'ADA' : 'TIDAK ADA'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600">
                  Jumlah Pengaturan
                </div>
                <div className="font-bold text-sm sm:text-base">
                  {configs.length} konfigurasi
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal - Konsisten dengan TicketPage */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Reset</h3>
                  <p className="text-sm text-gray-600">
                    Reset pengaturan ke default?
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700">
                  Semua perubahan yang belum disimpan akan hilang.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Reset
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

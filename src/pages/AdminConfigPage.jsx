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

export default function AdminConfigPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      // Update semua config sekaligus
      const updates = configs.map((config) => ({
        id: config.id,
        config_value: config.config_value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('event_config').upsert(updates);

      if (error) throw error;

      showToast.success('Konfigurasi berhasil disimpan!');
      setHasChanges(false);

      // Refresh data
      setTimeout(() => fetchConfigs(), 500);
    } catch (error) {
      console.error('Error saving config:', error);
      showToast.error('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset semua pengaturan ke nilai default?')) {
      fetchConfigs();
      setHasChanges(false);
      showToast.info('Pengaturan direset');
    }
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-7 h-7 text-blue-600" />
                Konfigurasi Waktu Acara
              </h1>
              <p className="text-gray-600">Atur jadwal presensi dan voting</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                hasChanges
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>

        {/* Status Current */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Status Sistem Saat Ini
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Card */}
            <div
              className={`p-5 rounded-lg border ${
                status.status === 'active'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : status.status === 'disabled'
                    ? 'bg-gradient-to-r from-red-50 to-red-50 border-red-200'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {status.status === 'active' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : status.status === 'disabled' ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="font-bold text-lg">
                    {status.status === 'active'
                      ? 'Sistem Aktif'
                      : status.status === 'disabled'
                        ? 'Sistem Dinonaktifkan'
                        : 'Sistem Menunggu'}
                  </div>
                  <div className="text-sm opacity-80">
                    {status.statusMessage}
                  </div>
                </div>
              </div>
            </div>

            {/* Time Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-gray-600">Waktu Server</div>
                <div className="font-mono font-bold">
                  {status.currentDate} {status.currentTime}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-gray-600">Status Voting</div>
                <div
                  className={`font-bold ${status.allowVoting ? 'text-green-600' : 'text-red-600'}`}
                >
                  {status.allowVoting ? 'DIJALANKAN' : 'DIMATIKAN'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Config Cards */}
        <div className="space-y-6">
          {/* Date Configuration */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Pengaturan Tanggal
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Atur tanggal pelaksanaan acara
              </p>
            </div>
            <div className="p-6">
              {configs
                .filter((c) => c.config_key === 'event_date')
                .map((config) => (
                  <div
                    key={config.id}
                    className="grid md:grid-cols-3 gap-6 items-center"
                  >
                    <div>
                      <label className="block font-medium text-gray-900 mb-2">
                        {config.label}
                      </label>
                      <p className="text-sm text-gray-500">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Format: YYYY-MM-DD</div>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded mt-1 ${config.config_value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {config.config_value
                          ? '✓ Tanggal diatur'
                          : '⚠ Belum diatur'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Time Configuration */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Pengaturan Waktu
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Atur jam operasional sistem
              </p>
            </div>
            <div className="p-6 space-y-6">
              {configs
                .filter(
                  (c) =>
                    c.config_key.includes('_start') ||
                    c.config_key.includes('_end')
                )
                .map((config) => (
                  <div
                    key={config.id}
                    className="grid md:grid-cols-3 gap-6 items-center"
                  >
                    <div>
                      <label className="block font-medium text-gray-900 mb-2">
                        {config.label}
                      </label>
                      <p className="text-sm text-gray-500">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Format: HH:MM (24 jam)</div>
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded mt-1 bg-blue-100 text-blue-800">
                        {config.config_key.includes('voting')
                          ? '⚙ Voting'
                          : '📋 Presensi'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* System Configuration */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Pengaturan Sistem
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Kontrol fitur dan akses
              </p>
            </div>
            <div className="p-6">
              {configs
                .filter((c) => c.config_key.includes('allow_'))
                .map((config) => (
                  <div
                    key={config.id}
                    className="grid md:grid-cols-3 gap-6 items-center"
                  >
                    <div>
                      <label className="block font-medium text-gray-900 mb-2">
                        {config.label}
                      </label>
                      <p className="text-sm text-gray-500">
                        {config.description}
                      </p>
                    </div>
                    <div>
                      <select
                        value={config.config_value}
                        onChange={(e) =>
                          handleChange(config.id, e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        <option value="true">Aktifkan</option>
                        <option value="false">Nonaktifkan</option>
                      </select>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Status Saat Ini</div>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded mt-1 ${config.config_value === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {config.config_value === 'true' ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            Diaktifkan
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Dinonaktifkan
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            Ringkasan Konfigurasi
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Jadwal Voting</div>
              <div className="font-bold">
                {status.votingStart && status.votingEnd
                  ? `${status.votingStart} - ${status.votingEnd}`
                  : 'Belum diatur'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Sistem Voting</div>
              <div
                className={`font-bold ${status.allowVoting ? 'text-green-600' : 'text-red-600'}`}
              >
                {status.allowVoting ? 'AKTIF' : 'NONAKTIF'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                Perubahan Belum Disimpan
              </div>
              <div
                className={`font-bold ${hasChanges ? 'text-amber-600' : 'text-gray-600'}`}
              >
                {hasChanges ? 'ADA' : 'TIDAK ADA'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Jumlah Pengaturan</div>
              <div className="font-bold">{configs.length} konfigurasi</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

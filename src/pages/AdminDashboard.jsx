import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  Users,
  CheckCircle,
  Vote,
  BarChart3,
  Settings,
  QrCode,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Shield,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalParticipants: 0,
    checkedIn: 0,
    voted: 0,
    totalCandidates: 0,
    votingRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('loading');
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cek session admin
  useEffect(() => {
    const isAdmin = localStorage.getItem('musma_admin_session');
    if (!isAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch semua data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Stats participants
      const { data: participants, error: participantsError } = await supabase
        .from('users')
        .select('status_kehadiran, sudah_vote');

      if (participantsError) throw participantsError;

      const totalParticipants = participants?.length || 0;
      const checkedIn =
        participants?.filter((p) => p.status_kehadiran).length || 0;
      const voted = participants?.filter((p) => p.sudah_vote).length || 0;
      const votingRate =
        checkedIn > 0 ? ((voted / checkedIn) * 100).toFixed(1) : 0;

      // 2. Stats candidates
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id');

      // 4. System config
      const { data: configs } = await supabase
        .from('event_config')
        .select('config_key, config_value');

      // Set states
      setStats({
        totalParticipants,
        checkedIn,
        voted,
        totalCandidates: candidates?.length || 0,
        votingRate: parseFloat(votingRate),
      });

      // Determine system status
      if (configs) {
        const config = {};
        configs.forEach((item) => {
          config[item.config_key] = item.config_value;
        });

        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().substring(0, 5);

        if (config.allow_voting === 'false') {
          setSystemStatus('disabled');
        } else if (currentDate !== config.event_date) {
          setSystemStatus('wrong_date');
        } else if (currentTime < config.voting_start) {
          setSystemStatus('too_early');
        } else if (currentTime > config.voting_end) {
          setSystemStatus('too_late');
        } else {
          setSystemStatus('active');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const usersSubscription = supabase
      .channel('users-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const votesSubscription = supabase
      .channel('votes-dashboard-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => {
          fetchDashboardData();
          showToast.info('Data voting diperbarui');
        }
      )
      .subscribe();

    return () => {
      usersSubscription.unsubscribe();
      votesSubscription.unsubscribe();
    };
  }, [fetchDashboardData]);

  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case 'active':
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'disabled':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'wrong_date':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getSystemStatusText = () => {
    switch (systemStatus) {
      case 'active':
        return 'Sistem Berjalan Normal';
      case 'disabled':
        return 'Sistem Dinonaktifkan';
      case 'wrong_date':
        return 'Hari Tidak Sesuai';
      case 'too_early':
        return 'Menunggu Jam Voting';
      case 'too_late':
        return 'Voting Selesai';
      default:
        return 'Status Tidak Diketahui';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat dashboard admin...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Panel kontrol sistem voting MUSMA 2025
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => navigate('/results')}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Quick Count</span>
                <span className="sm:hidden">Hasil</span>
              </button>
            </div>
          </div>

          {/* System Status Banner */}
          <div
            className={`${getSystemStatusColor()} text-white rounded-xl sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-8 shadow-lg`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  {systemStatus === 'active' ? (
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                  ) : (
                    <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold">
                    {getSystemStatusText()}
                  </h2>
                  <p className="opacity-90 text-xs sm:text-sm">
                    Pantau dan kelola sistem voting secara real-time
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-lg sm:text-2xl font-bold">
                  {stats.checkedIn}/{stats.totalParticipants}
                </div>
                <div className="text-xs sm:text-sm opacity-90">
                  Peserta Check-in
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
            {/* Total Participants */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Total Peserta
                </div>
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">
                {stats.totalParticipants}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                Terdaftar di sistem
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Check-in</span>
                  <span className="font-medium">{stats.checkedIn} orang</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                  <div
                    className="h-1.5 sm:h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{
                      width: `${
                        (stats.checkedIn /
                          Math.max(stats.totalParticipants, 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Voting Stats */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Status Voting
                </div>
                <Vote className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">
                {stats.voted}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                suara masuk
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Tingkat Partisipasi</span>
                  <span className="font-medium">{stats.votingRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1">
                  <div
                    className="h-1.5 sm:h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${stats.votingRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Candidates */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="text-gray-600 text-xs sm:text-sm">Kandidat</div>
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="text-xl sm:text-3xl font-bold text-gray-900">
                {stats.totalCandidates}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                calon yang bertanding
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/results')}
                  className="w-full py-1.5 sm:py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  Lihat Peringkat
                </button>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Waktu Server
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 font-mono">
                {serverTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 truncate">
                {serverTime.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Zone: WIB (GMT+7)</span>
                  <span className="inline-flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Real-time
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
            {/* Scan QR */}
            <button
              onClick={() => navigate('/admin/scan')}
              className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 sm:hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition flex-shrink-0">
                  <QrCode className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    Scan Presensi
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Check-in peserta dengan QR code
                  </p>
                </div>
              </div>
              <div className="text-blue-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                Buka Scanner →
              </div>
            </button>

            {/* Quick Count */}
            <button
              onClick={() => navigate('/results')}
              className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 sm:hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition flex-shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    Quick Count
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Lihat hasil voting real-time
                  </p>
                </div>
              </div>
              <div className="text-green-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                Lihat Hasil →
              </div>
            </button>

            {/* Configuration */}
            <button
              onClick={() => navigate('/admin/config')}
              className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 sm:hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition flex-shrink-0">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    Konfigurasi
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Atur waktu dan pengaturan sistem
                  </p>
                </div>
              </div>
              <div className="text-amber-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                Kelola Pengaturan →
              </div>
            </button>

            {/* Manage Candidates */}
            <button
              onClick={() => navigate('/admin/candidates')}
              className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 sm:hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition flex-shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    Kelola Kandidat
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Tambah/edit data calon ketua
                  </p>
                </div>
              </div>
              <div className="text-purple-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                Buka Kelola →
              </div>
            </button>
          </div>

          {/* Recent Activity */}
          {/* Recent Activity - Modified */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Aktivitas Sistem
              </h2>
              <p className="text-sm text-gray-600">
                Statistik voting real-time
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">
                      Total Vote Masuk
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.voted}
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">
                      Waktu Server Live
                    </div>
                    <div className="text-lg font-bold text-gray-900 font-mono">
                      {serverTime.toLocaleTimeString('id-ID', {
                        // <-- GANTI new Date() dengan serverTime
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {serverTime.toLocaleDateString('id-ID', {
                        // <-- GANTI disini juga
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="relative">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700">
                    <strong>Prinsip Kerahasiaan:</strong>
                    <br />
                    Data voting tidak mencatat identitas pemilih
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

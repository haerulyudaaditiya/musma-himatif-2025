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
  LogOut,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Shield,
} from 'lucide-react';

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
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemStatus, setSystemStatus] = useState('loading');

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

      // 3. Recent votes (last 5)
      const { data: recentVotes } = await supabase
        .from('votes')
        .select(
          `
          id,
          created_at,
          voter_name,
          voter_class,
          candidates (nama, no_urut)
        `
        )
        .order('created_at', { ascending: false })
        .limit(5);

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

      setRecentActivity(recentVotes || []);

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

  const handleLogout = () => {
    if (window.confirm('Keluar dari Mode Admin?')) {
      localStorage.removeItem('musma_admin_session');
      showToast.info('Anda telah logout dari admin');
      navigate('/');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-7 h-7 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Panel kontrol sistem voting MUSMA 2024
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/results')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Quick Count
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* System Status Banner */}
        <div
          className={`${getSystemStatusColor()} text-white rounded-xl p-6 mb-8 shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {systemStatus === 'active' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{getSystemStatusText()}</h2>
                <p className="opacity-90">
                  Pantau dan kelola sistem voting secara real-time
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {stats.checkedIn}/{stats.totalParticipants}
              </div>
              <div className="text-sm opacity-90">Peserta Check-in</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Participants */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600">Total Peserta</div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalParticipants}
            </div>
            <div className="text-sm text-gray-500">Terdaftar di sistem</div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Check-in</span>
                <span className="font-medium">{stats.checkedIn} orang</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{
                    width: `${(stats.checkedIn / Math.max(stats.totalParticipants, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Voting Stats */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600">Status Voting</div>
              <Vote className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.voted}
            </div>
            <div className="text-sm text-gray-500">suara masuk</div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tingkat Partisipasi</span>
                <span className="font-medium">{stats.votingRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: `${stats.votingRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Candidates */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600">Kandidat</div>
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalCandidates}
            </div>
            <div className="text-sm text-gray-500">calon yang bertanding</div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/results')}
                className="w-full py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Lihat Peringkat
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600">Waktu Server</div>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">
              {new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Data diperbarui real-time
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Scan QR */}
          <button
            onClick={() => navigate('/admin/scan')}
            className="bg-white rounded-xl shadow border border-gray-100 p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Scan Presensi</h3>
                <p className="text-sm text-gray-600">
                  Check-in peserta dengan QR code
                </p>
              </div>
            </div>
            <div className="text-blue-600 font-medium flex items-center gap-1">
              Buka Scanner →
            </div>
          </button>

          {/* Quick Count */}
          <button
            onClick={() => navigate('/results')}
            className="bg-white rounded-xl shadow border border-gray-100 p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Quick Count</h3>
                <p className="text-sm text-gray-600">
                  Lihat hasil voting real-time
                </p>
              </div>
            </div>
            <div className="text-green-600 font-medium flex items-center gap-1">
              Lihat Hasil →
            </div>
          </button>

          {/* Configuration */}
          <button
            onClick={() => navigate('/admin/config')}
            className="bg-white rounded-xl shadow border border-gray-100 p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Settings className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Konfigurasi</h3>
                <p className="text-sm text-gray-600">
                  Atur waktu dan pengaturan sistem
                </p>
              </div>
            </div>
            <div className="text-amber-600 font-medium flex items-center gap-1">
              Kelola Pengaturan →
            </div>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Aktivitas Terbaru
            </h2>
            <p className="text-sm text-gray-600">
              5 voting terakhir yang terekam
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                        <Vote className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {activity.voter_name} ({activity.voter_class})
                        </div>
                        <div className="text-sm text-gray-600">
                          Memilih{' '}
                          <span className="font-semibold">
                            {activity.candidates?.nama}
                          </span>{' '}
                          (No. {activity.candidates?.no_urut})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(activity.created_at).toLocaleTimeString(
                          'id-ID',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString(
                          'id-ID'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Belum Ada Aktivitas
                </h3>
                <p className="text-gray-600">Tidak ada voting yang terekam</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

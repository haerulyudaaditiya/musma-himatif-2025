import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  BarChart3,
  Users,
  Percent,
  TrendingUp,
  RefreshCw,
  Eye,
  Shield,
  Award,
  CheckCircle,
  ArrowLeft,
  Users2,
} from 'lucide-react';
import VoterList from '../components/VoterList';

export default function QuickCountPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Cek apakah user sudah vote (untuk non-admin)
  const checkUserVote = useCallback(async () => {
    const nim = localStorage.getItem('musma_nim');
    const adminSession = localStorage.getItem('musma_admin_session');

    if (adminSession) {
      setIsAdmin(true);
      return true;
    }

    if (!nim) {
      showToast.error('Anda harus login untuk melihat hasil');
      navigate('/');
      return false;
    }

    try {
      const { data } = await supabase
        .from('users')
        .select('sudah_vote')
        .eq('nim', nim)
        .single();

      if (!data?.sudah_vote) {
        showToast.error(
          'Anda harus voting terlebih dahulu untuk melihat hasil'
        );
        navigate('/ticket');
        return false;
      }

      return true;
    } catch {
      showToast.error('Gagal memverifikasi status voting');
      navigate('/ticket');
      return false;
    }
  }, [navigate]);

  // Fetch voting results
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get all candidates with vote count
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('no_urut', { ascending: true });

      if (candidatesError) throw candidatesError;

      // 2. Get votes count per candidate
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('candidate_id');

      if (votesError) throw votesError;

      // 3. Calculate total voters
      const { data: votersData } = await supabase
        .from('users')
        .select('id')
        .eq('status_kehadiran', true);

      // 4. Calculate results
      const votesCount = {};
      votesData?.forEach((vote) => {
        votesCount[vote.candidate_id] =
          (votesCount[vote.candidate_id] || 0) + 1;
      });

      const total = votesData?.length || 0;
      const totalVotersCount = votersData?.length || 0;

      // 5. Prepare results with percentage
      const resultsData =
        candidates?.map((candidate) => {
          const votes = votesCount[candidate.id] || 0;
          const percentage = total > 0 ? ((votes / total) * 100).toFixed(1) : 0;

          return {
            ...candidate,
            votes,
            percentage: parseFloat(percentage),
            isLeading: false, // Will be set after sorting
          };
        }) || [];

      // 6. Sort by votes and mark leading candidate
      resultsData.sort((a, b) => b.votes - a.votes);
      if (resultsData.length > 0 && resultsData[0].votes > 0) {
        resultsData[0].isLeading = true;
      }

      setResults(resultsData);
      setTotalVotes(total);
      setTotalVoters(totalVotersCount);
      setLastUpdated(new Date().toLocaleTimeString('id-ID'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      showToast.error('Gagal memuat hasil voting');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const canView = await checkUserVote();
      if (canView) {
        fetchResults();
        // Set up real-time subscription
        const subscription = supabase
          .channel('votes-channel')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'votes' },
            () => {
              fetchResults();
              showToast.info('Hasil diperbarui!');
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      }
    };

    initialize();
  }, [checkUserVote, fetchResults]);

  const refreshResults = () => {
    fetchResults();
    showToast.success('Memperbarui hasil...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat hasil quick count...
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const votingRate =
    totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : 0;
  const leadingCandidate = results.find((r) => r.isLeading);
  const hasVotes = totalVotes > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/ticket')}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                Quick Count MUSMA 2024
              </h1>
              <p className="text-gray-600">Hasil voting real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshResults}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
              >
                <Users2 className="w-4 h-4" />
                Lihat Detail Pemilih
              </button>
            )}

            {isAdmin && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                Admin Mode
              </div>
            )}
          </div>
        </div>

        <VoterList show={showDetails} onClose={() => setShowDetails(false)} />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Total Suara</div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalVotes}</div>
            <div className="text-sm text-gray-500">suara sah</div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Pemilih Hadir</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {totalVoters}
            </div>
            <div className="text-sm text-gray-500">peserta check-in</div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Tingkat Partisipasi</div>
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {votingRate}%
            </div>
            <div className="text-sm text-gray-500">dari pemilih hadir</div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Posisi Teratas</div>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {leadingCandidate ? `No. ${leadingCandidate.no_urut}` : '-'}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {leadingCandidate?.nama || 'Belum ada suara'}
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Perolehan Suara Kandidat
              </h2>
              <div className="text-sm text-gray-500">
                Terakhir diperbarui: {lastUpdated}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    No. Urut
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Nama Kandidat
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Perolehan Suara
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Persentase
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className={`hover:bg-gray-50 ${candidate.isLeading ? 'bg-gradient-to-r from-green-50 to-emerald-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            candidate.isLeading
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {candidate.no_urut}
                        </div>
                        {candidate.isLeading && (
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {candidate.nama}
                      </div>
                      <div className="text-sm text-gray-500">
                        {candidate.jurusan || 'Teknik Informatika'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-lg">
                        {candidate.votes}
                      </div>
                      <div className="text-sm text-gray-500">suara</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">
                            {candidate.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              candidate.isLeading
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${candidate.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {candidate.isLeading ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <TrendingUp className="w-4 h-4" />
                          Posisi Teratas
                        </div>
                      ) : hasVotes ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Dalam Perhitungan
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                          Menunggu Suara
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasVotes && (
            <div className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Belum Ada Suara Masuk
              </h3>
              <p className="text-gray-600">
                Hasil akan ditampilkan setelah pemilihan dimulai
              </p>
            </div>
          )}
        </div>

        {/* Additional Stats & Info */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Voting Progress */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Progress Voting
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Suara masuk</span>
                  <span className="font-medium">
                    {totalVotes} dari {totalVoters}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{
                      width: `${(totalVotes / Math.max(totalVoters, 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {totalVoters - totalVotes} pemilih hadir belum menggunakan hak
                suara
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Informasi Sistem
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                  i
                </div>
                <span className="text-gray-700">
                  Data diperbarui secara real-time
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                  i
                </div>
                <span className="text-gray-700">
                  Hasil bersifat sementara hingga penghitungan final
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                  i
                </div>
                <span className="text-gray-700">
                  Hanya peserta yang sudah voting dapat melihat hasil
                </span>
              </li>
              {isAdmin && (
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs mt-0.5">
                    A
                  </div>
                  <span className="text-gray-700">
                    Anda dalam mode Admin dengan akses penuh
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

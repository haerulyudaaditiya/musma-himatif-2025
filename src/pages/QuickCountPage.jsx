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
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function QuickCountPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkUserVote = useCallback(async () => {
    const adminSession = localStorage.getItem('musma_admin_session');

    if (adminSession) {
      setIsAdmin(true);
      return true;
    }

    showToast.error('Hanya panitia yang boleh melihat hasil quick count');
    navigate('/ticket');
    return false;
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
    let channel;

    const init = async () => {
      const canView = await checkUserVote();
      if (!canView) return;

      fetchResults();

      channel = supabase
        .channel('votes-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'votes',
          },
          () => {
            fetchResults(); 
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [checkUserVote, fetchResults]);

  const refreshResults = () => {
    fetchResults();
    showToast.success('Memperbarui hasil...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Memuat hasil quick count...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate statistics
  const votingRate =
    totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : 0;
  const leadingCandidate = results.find((r) => r.isLeading);
  const hasVotes = totalVotes > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() =>
                  navigate(isAdmin ? '/admin/dashboard' : '/ticket')
                }
                className="p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  Quick Count MUSMA 2025
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Hasil voting real-time
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={refreshResults}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <Users2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Detail Pemilih</span>
                  <span className="sm:hidden">Detail</span>
                </button>
              )}

              {isAdmin && (
                <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Admin
                </div>
              )}
            </div>
          </div>

          <VoterList show={showDetails} onClose={() => setShowDetails(false)} />

          {/* Statistics Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Total Suara
                </div>
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {totalVotes}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">suara sah</div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Pemilih Hadir
                </div>
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {totalVoters}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">check-in</div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Partisipasi
                </div>
                <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {votingRate}%
              </div>
              <div className="text-xs sm:text-sm text-gray-500">dari hadir</div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="text-gray-600 text-xs sm:text-sm">
                  Posisi Teratas
                </div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {leadingCandidate ? `No. ${leadingCandidate.no_urut}` : '-'}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 truncate">
                {leadingCandidate?.nama?.split(' ')[0] || 'Belum ada'}
              </div>
            </div>
          </div>

          {/* Results Table - Mobile Optimized */}
          <div className="bg-white rounded-xl sm:rounded-xl shadow border border-gray-100 overflow-hidden mb-4 sm:mb-8">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  Perolehan Suara Kandidat
                </h2>
                <div className="text-xs sm:text-sm text-gray-500">
                  Diperbarui: {lastUpdated}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] sm:min-w-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
                      No.
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
                      Nama Kandidat
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
                      Suara
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
                      %
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
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
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${
                              candidate.isLeading
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {candidate.no_urut}
                          </div>
                          {candidate.isLeading && (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse hidden sm:block"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">
                          {candidate.nama}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none">
                          {candidate.jurusan || 'Teknik Informatika'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="font-bold text-gray-900 text-base sm:text-lg">
                          {candidate.votes}
                        </div>
                        <div className="text-xs text-gray-500">suara</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900 text-sm sm:text-base">
                            {candidate.percentage}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                            <div
                              className={`h-1.5 sm:h-2 rounded-full ${
                                candidate.isLeading
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
                              }`}
                              style={{ width: `${candidate.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        {candidate.isLeading ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <TrendingUp className="w-3 h-3" />
                            <span className="hidden sm:inline">Teratas</span>
                            <span className="sm:hidden">1</span>
                          </div>
                        ) : hasVotes ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Proses</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            Menunggu
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!hasVotes && (
              <div className="p-6 sm:p-8 text-center">
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                  Belum Ada Suara Masuk
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Hasil akan ditampilkan setelah pemilihan dimulai
                </p>
              </div>
            )}
          </div>

          {/* Additional Stats & Info - Mobile Optimized */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Voting Progress */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                Progress Voting
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-gray-600">Suara masuk</span>
                    <span className="font-medium">
                      {totalVotes} / {totalVoters}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
                    <div
                      className="h-2 sm:h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{
                        width: `${(totalVotes / Math.max(totalVoters, 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {totalVoters - totalVotes} pemilih belum voting
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-3 sm:p-4">
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                Informasi Sistem
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                  </div>
                  <span className="text-gray-700">Data real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                  </div>
                  <span className="text-gray-700">Hasil sementara</span>
                </li>
                {isAdmin && (
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                    </div>
                    <span className="text-gray-700">Mode Admin aktif</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

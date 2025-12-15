import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import { checkVotingAvailability } from '../utils/timeCheck';
import {
  Vote,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Award,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function VotePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [user, setUser] = useState(null);
  const [votingProcessing, setVotingProcessing] = useState(false);
  const [votingStatus, setVotingStatus] = useState({
    allowed: false,
    message: '',
    status: 'checking',
  });

  // Fungsi untuk cek semua eligibility
  const checkEligibility = useCallback(async () => {
    const nim = localStorage.getItem('musma_nim');
    if (!nim) {
      showToast.error('Sesi habis. Silakan daftar/login ulang.');
      navigate('/');
      return;
    }

    try {
      // 1. Ambil data user terbaru
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('nim', nim)
        .single();

      if (userError || !userData) {
        throw new Error('Data peserta tidak ditemukan');
      }

      setUser(userData);

      // 2. Cek apakah sudah check-in
      if (!userData.status_kehadiran) {
        setVotingStatus({
          allowed: false,
          message:
            'Anda belum check-in. Silakan temui panitia untuk scan QR code.',
          status: 'not_checked_in',
        });
        setLoading(false);
        return;
      }

      // 3. Cek apakah sudah vote
      if (userData.sudah_vote) {
        setVotingStatus({
          allowed: false,
          message: 'Anda sudah menggunakan hak suara.',
          status: 'already_voted',
        });
        setLoading(false);
        return;
      }

      // 4. Cek waktu voting availability
      const timeCheck = await checkVotingAvailability();
      setVotingStatus(timeCheck);

      if (!timeCheck.allowed) {
        setLoading(false);
        return;
      }

      // 5. Jika semua lolos, tampilkan kandidat
      setLoading(false);
    } catch (error) {
      showToast.error(error.message);
      navigate('/ticket');
    }
  }, [navigate]);

  // Fetch kandidat
  const fetchCandidates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('no_urut', { ascending: true });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  }, []);

  useEffect(() => {
    checkEligibility();
    fetchCandidates();
  }, [checkEligibility, fetchCandidates]);

  // Modal konfirmasi voting
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const openConfirmModal = (candidate) => {
    setSelectedCandidate(candidate);
    setShowConfirmModal(true);
  };

  const handleVote = async () => {
    if (!selectedCandidate) return;

    setVotingProcessing(true);
    setShowConfirmModal(false);

    try {
      // 1. Insert vote ke database
      const { error: voteError } = await supabase.from('votes').insert([
        {
          candidate_id: selectedCandidate.id,
        },
      ]);

      if (voteError) throw voteError;

      // 2. Update status user
      const { error: userError } = await supabase
        .from('users')
        .update({
          sudah_vote: true,
          waktu_vote: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // 3. Update local state
      setUser((prev) => ({ ...prev, sudah_vote: true }));
      setVotingStatus({
        allowed: false,
        message: 'Anda sudah menggunakan hak suara.',
        status: 'already_voted',
      });

      showToast.success('Terima kasih! Suara Anda telah direkam.');

      // Redirect setelah 2 detik
      setTimeout(() => navigate('/ticket'), 2000);
    } catch (error) {
      showToast.error('Gagal melakukan voting: ' + error.message);
    } finally {
      setVotingProcessing(false);
      setSelectedCandidate(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Memeriksa hak akses voting...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bilik Suara Digital
            </h1>
            <p className="text-gray-600">Gunakan hak pilih Anda dengan bijak</p>

            {/* User Info */}
            {user && (
              <div className="mt-6 inline-flex items-center justify-center bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
                <div>
                  <div className="font-medium text-gray-900">{user.nama}</div>
                  <div className="text-xs text-gray-600">
                    {user.kelas} • {user.nim}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voting Status Card */}
          <div className="mb-8">
            <div
              className={`p-6 rounded-xl shadow border ${
                votingStatus.status === 'active'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : votingStatus.status === 'already_voted'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                  : votingStatus.status === 'not_checked_in'
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {votingStatus.status === 'active' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Vote className="w-5 h-5 text-green-600" />
                  </div>
                ) : votingStatus.status === 'already_voted' ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                ) : votingStatus.status === 'not_checked_in' ? (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-amber-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">
                    {votingStatus.status === 'active'
                      ? 'Siap Memilih'
                      : votingStatus.status === 'already_voted'
                      ? 'Sudah Memilih'
                      : votingStatus.status === 'not_checked_in'
                      ? 'Belum Check-in'
                      : 'Menunggu Waktu Voting'}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {votingStatus.message}
                  </p>
                </div>

                {votingStatus.status === 'active' && (
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Status Voting</div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      AKTIF
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keamanan & Kerahasiaan Pemilihan - CARD PUTIH */}
          <div className="mb-6 bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              Keamanan & Kerahasiaan Pemilihan
            </h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                </div>
                <span>
                  Pilihan Anda bersifat <strong>RAHASIA</strong> dan tidak
                  tercatat identitasnya
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                </div>
                <span>
                  Hasil hanya dapat dilihat oleh panitia setelah voting ditutup
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                </div>
                <span>Sistem tidak menyimpan data pilihan per individu</span>
              </li>
            </ul>
          </div>

          {/* Candidates Grid */}
          {votingStatus.status === 'active' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  Daftar Kandidat
                </h2>
                <p className="text-gray-600 text-sm">
                  Pilih satu kandidat dengan menekan tombol "PILIH"
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    {/* Candidate Number */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center text-lg font-bold shadow">
                        {candidate.no_urut}
                      </div>
                    </div>

                    {/* Candidate Photo */}
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {candidate.foto_url ? (
                        <img
                          src={candidate.foto_url}
                          alt={candidate.nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {candidate.nama}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3">
                        {candidate.jurusan || 'Teknik Informatika'}
                      </p>

                      {/* Vision & Mission Accordion */}
                      <div className="mb-3">
                        <div className="collapse collapse-arrow border border-gray-200 rounded-lg">
                          <input type="checkbox" />
                          <div className="collapse-title font-medium text-gray-700 text-xs px-3 py-2">
                            Lihat Visi & Misi
                          </div>
                          <div className="collapse-content">
                            <p className="text-gray-600 text-xs whitespace-pre-line p-2">
                              {candidate.visi_misi ||
                                'Tidak ada data visi misi.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vote Button */}
                      <button
                        onClick={() => openConfirmModal(candidate)}
                        disabled={votingProcessing}
                        className={`w-full py-2 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2 text-sm ${
                          votingProcessing
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                        }`}
                      >
                        {votingProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Vote className="w-4 h-4" />
                            PILIH KANDIDAT INI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Back to Ticket Button */}
          {votingStatus.status !== 'active' && (
            <div className="text-center mt-6">
              <button
                onClick={() => navigate('/ticket')}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all text-sm"
              >
                Kembali ke Tiket Saya
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    Konfirmasi Pilihan
                  </h3>
                  <p className="text-sm text-gray-600">
                    Anda akan memilih kandidat:
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700 mb-1">
                    No. {selectedCandidate.no_urut}
                  </div>
                  <div className="font-bold text-gray-900">
                    {selectedCandidate.nama}
                  </div>
                  {selectedCandidate.jurusan && (
                    <div className="text-gray-600 text-xs mt-1">
                      {selectedCandidate.jurusan}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>PERHATIAN:</strong> Pilihan tidak dapat diubah
                    setelah dikonfirmasi.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleVote}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Ya, Saya Yakin
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

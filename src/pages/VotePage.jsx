import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { Lock, CheckCircle } from 'lucide-react';

export default function VotePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [user, setUser] = useState(null);
  const [votingProcessing, setVotingProcessing] = useState(false);

  const checkEligibility = useCallback(async () => {
    const nim = localStorage.getItem('musma_nim');
    if (!nim) {
      alert('Sesi habis. Silakan daftar/login ulang.');
      navigate('/');
      return;
    }

    // Ambil status user terbaru dari DB
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nim', nim)
      .single();

    if (error || !data) {
      navigate('/');
      return;
    }

    // --- LOGIC PENTING ---
    if (!data.status_kehadiran) {
      alert(
        '❌ ANDA BELUM CHECK-IN!\nSilakan temui panitia untuk scan QR Code terlebih dahulu.'
      );
      navigate('/ticket'); // Tendang balik ke tiket
      return;
    }

    if (data.sudah_vote) {
      // Jika sudah vote, jangan kasih akses halaman ini, langsung lempar ke hasil/selesai
      alert('✅ Anda sudah menggunakan hak suara.');
      navigate('/ticket'); // Atau nanti ke halaman Quick Count
      return;
    }

    setUser(data);
    setLoading(false);
  }, [navigate]);

  const fetchCandidates = useCallback(async () => {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .order('no_urut', { ascending: true });
    setCandidates(data || []);
  }, []);

  // 1. Cek Kelayakan Pemilih
  useEffect(() => {
    checkEligibility();
    fetchCandidates();
  }, [checkEligibility, fetchCandidates]);

  // 2. Proses Voting (Transaksi)
  const handleVote = async (candidateId, candidateName) => {
    const confirm = window.confirm(
      `YAKIN MEMILIH NO. URUT ${candidateId}?\n(${candidateName})\nPilihan tidak dapat diubah!`
    );
    if (!confirm) return;

    setVotingProcessing(true);

    try {
      // A. Masukkan Suara ke Kotak Suara
      const { error: voteError } = await supabase
        .from('votes')
        .insert([{ candidate_id: candidateId }]);

      if (voteError) throw voteError;

      // B. Tandai User Sudah Memilih (Kunci Akun)
      const { error: userError } = await supabase
        .from('users')
        .update({ sudah_vote: true, waktu_vote: new Date() })
        .eq('id', user.id);

      if (userError) throw userError;

      // C. Sukses
      alert('TERIMA KASIH! Suara Anda telah direkam.');
      navigate('/ticket'); // Balik ke tiket, nanti statusnya berubah jadi 'Sudah Vote'
    } catch (error) {
      alert('Gagal melakukan voting: ' + error.message);
    } finally {
      setVotingProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold">
        Memeriksa Hak Akses...
      </div>
    );

  return (
    <div className="min-h-screen bg-base-200 p-4 pb-20">
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-black text-primary">BILIK SUARA</h1>
        <p className="text-gray-600">Gunakan hak pilih Anda dengan bijak.</p>
        <div className="badge badge-accent mt-2 font-mono">
          Pemilih: {user.nama}
        </div>
      </div>

      {/* Grid Kandidat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {candidates.map((kandidat) => (
          <div
            key={kandidat.id}
            className="card bg-base-100 shadow-xl border border-base-300 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <figure className="px-6 pt-6 relative">
              <img
                src={kandidat.foto_url}
                alt={kandidat.nama}
                className="rounded-xl h-64 w-full object-cover bg-gray-100"
              />
              <div className="absolute top-4 right-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">
                {kandidat.no_urut}
              </div>
            </figure>

            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-bold">{kandidat.nama}</h2>

              <div className="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box w-full my-2">
                <input type="checkbox" />
                <div className="collapse-title text-sm font-medium">
                  Lihat Visi & Misi
                </div>
                <div className="collapse-content text-left text-sm text-gray-600">
                  <p>{kandidat.visi_misi}</p>
                </div>
              </div>

              <div className="card-actions w-full mt-2">
                <button
                  onClick={() => handleVote(kandidat.id, kandidat.nama)}
                  disabled={votingProcessing}
                  className="btn btn-primary w-full btn-lg shadow-lg text-white"
                >
                  {votingProcessing
                    ? 'Mencoblos...'
                    : 'COBLOS NOMOR ' + kandidat.no_urut}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../libs/supabaseClient';
import { LogOut } from 'lucide-react'; // Ikon Logout

export default function TicketPage() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipant = async () => {
      // 1. Cek apakah ada sesi tersimpan di browser
      const savedNim = localStorage.getItem('musma_nim');

      if (!savedNim) {
        // Kalau gak ada, tendang balik ke halaman daftar
        navigate('/');
        return;
      }

      // 2. Ambil data lengkap user dari Supabase berdasarkan NIM
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('nim', savedNim)
        .single();

      if (error || !data) {
        alert('Data tidak ditemukan! Silakan daftar ulang.');
        localStorage.removeItem('musma_nim');
        navigate('/');
      } else {
        setParticipant(data);
      }
      setLoading(false);
    };

    fetchParticipant();
  }, [navigate]);

  const handleLogout = () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin keluar? Tiket akan hilang dari perangkat ini.'
    );
    if (confirm) {
      localStorage.removeItem('musma_nim');
      navigate('/');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Memuat Tiket...
      </div>
    );

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4">
      {/* Header Info */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-primary">MUSMA HIMATIF</h1>
        <p className="text-gray-500">Tiket Masuk Digital</p>
      </div>

      {/* Kartu Tiket */}
      <div className="card w-full max-w-sm bg-white shadow-2xl border-t-8 border-primary">
        <div className="card-body items-center text-center p-8">
          {/* Status Badge */}
          <div
            className={`badge ${
              participant.status_kehadiran ? 'badge-success' : 'badge-warning'
            } gap-2 mb-4 p-3`}
          >
            {participant.status_kehadiran ? 'SUDAH CHECK-IN' : 'BELUM CHECK-IN'}
          </div>

          {/* Nama & Info */}
          <h2 className="card-title text-2xl font-extrabold uppercase">
            {participant.nama}
          </h2>
          <p className="text-lg font-mono text-gray-600">{participant.nim}</p>
          <div className="badge badge-outline badge-lg mt-2 font-bold">
            {participant.kelas}
          </div>

          {/* Area QR Code */}
          <div className="my-6 p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl">
            {/* Value QR adalah ID (UUID) unik user, bukan NIM, biar lebih aman */}
            <QRCode
              value={participant.id}
              size={180}
              level="H" // Level koreksi error tinggi (biar gampang discan)
            />
          </div>

          <p className="text-xs text-gray-400">
            Tunjukkan QR Code ini kepada panitia di meja registrasi untuk
            presensi.
          </p>
        </div>
      </div>

      {/* Tombol Logout / Ganti Akun */}
      <button
        onClick={handleLogout}
        className="btn btn-ghost text-error btn-sm mt-8 gap-2"
      >
        <LogOut size={16} />
        Ganti Akun / Keluar
      </button>
    </div>
  );
}

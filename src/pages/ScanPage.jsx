import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode'; 
import { supabase } from '../libs/supabaseClient';
import { ArrowLeft, LogOut } from 'lucide-react';

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true); 

  useEffect(() => {
    const isAdmin = localStorage.getItem('musma_admin_session');
    if (!isAdmin) {
      alert('Akses Ditolak! Harap Login Admin dulu.');
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    // Settingan Scanner
    const scanner = new Html5QrcodeScanner(
      'reader', 
      {
        fps: 10, // Frame per second
        qrbox: { width: 250, height: 250 }, 
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    // Logic saat QR Terbaca
    const onScanSuccess = async (decodedText) => {
      if (!isScanning) return;

      scanner.clear();
      setIsScanning(false);

      try {
        const { data, error } = await supabase
          .from('users')
          .update({ status_kehadiran: true }) 
          .eq('id', decodedText)
          .select()
          .single();

        if (error || !data) {
          throw new Error('QR Code Tidak Valid / Data tidak ditemukan!');
        }

        // Tampilkan Sukses
        setScanResult(data);
        alert(`✅ BERHASIL! Selamat Datang, ${data.nama}`);
      } catch (err) {
        alert('❌ ERROR: ' + err.message);
      } finally {
        // Refresh halaman otomatis untuk mereset scanner (cara paling stabil)
        // Atau buat tombol "Scan Lagi" manual
      }
    };

    const onScanFailure = () => {
      // 
    };

    // Render Scanner
    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup: Matikan kamera saat pindah halaman
    return () => {
      scanner
        .clear()
        .catch((error) => console.error('Failed to clear scanner ', error));
    };
  }, [isScanning]); // Run sekali saat mount

  // Fungsi Reset untuk Scan Berikutnya
  const handleReset = () => {
    window.location.reload(); // Reload page adalah cara paling bersih mereset html5-qrcode
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari Mode Admin?')) {
      localStorage.removeItem('musma_admin_session');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center pt-6 px-4">
      {/* Header Admin */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between text-white">
        <button
          onClick={() => navigate('/')}
          className="btn btn-ghost btn-sm text-gray-300"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <h1 className="text-lg font-bold tracking-widest text-primary">
          ADMIN GATE
        </h1>
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm text-error"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* AREA KAMERA */}
      <div className="card w-full max-w-md bg-white shadow-2xl overflow-hidden">
        {/* Container ini ID-nya harus 'reader' sesuai config di atas */}
        {!scanResult ? (
          <div id="reader" className="w-full"></div>
        ) : (
          // Tampilan Jika Berhasil Scan
          <div className="p-10 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800">
              {scanResult.nama}
            </h2>
            <p className="text-gray-500 font-mono text-lg">{scanResult.nim}</p>
            <div className="badge badge-primary badge-lg mt-2">
              {scanResult.kelas}
            </div>

            <div className="divider"></div>

            <button
              onClick={handleReset}
              className="btn btn-neutral w-full btn-lg shadow-lg"
            >
              SCAN PESERTA BERIKUTNYA
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-8 text-center max-w-xs">
        Pastikan browser mengizinkan akses kamera. Gunakan pencahayaan yang
        cukup.
      </p>
    </div>
  );
}

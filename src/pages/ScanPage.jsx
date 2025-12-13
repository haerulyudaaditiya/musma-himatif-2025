import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  QrCode,
  ArrowLeft,
  LogOut,
  CheckCircle,
  User,
  Users,
  Hash,
  AlertCircle,
  RefreshCw,
  Camera,
  CameraOff,
  XCircle,
} from 'lucide-react';

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanner, setScanner] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [participantToCheckin, setParticipantToCheckin] = useState(null);

  // Cek session admin
  useEffect(() => {
    const isAdmin = localStorage.getItem('musma_admin_session');
    if (!isAdmin) {
      showToast.error('Akses ditolak. Harap login sebagai admin.');
      navigate('/admin/login');
    }
  }, [navigate]);

  // Initialize scanner
  const initScanner = useCallback(() => {
    if (!isScanning || scanner) return;

    try {
      const newScanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      const onScanSuccess = async (decodedText) => {
        if (processing || !isScanning) return;

        try {
          // Parse QR data (bisa berupa ID atau JSON)
          let participantId = decodedText;

          // Cek apakah QR berisi JSON
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.id) participantId = parsed.id;
          } catch {
            // Bukan JSON, gunakan langsung sebagai ID
          }

          // Fetch participant data
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', participantId)
            .single();

          if (error || !data) {
            throw new Error('QR Code tidak valid / Peserta tidak ditemukan');
          }

          // Cek apakah sudah check-in
          if (data.status_kehadiran) {
            showToast.warning(`${data.nama} sudah check-in sebelumnya`);
            return;
          }

          // Stop scanning dan tampilkan konfirmasi
          newScanner.clear();
          setIsScanning(false);
          setParticipantToCheckin(data);
          setShowConfirmModal(true);
        } catch (error) {
          console.error('Scan error:', error);
          showToast.error(error.message);

          // Auto-resume scanning setelah error
          setTimeout(() => {
            if (scanner && isScanning) {
              scanner.resume();
            }
          }, 2000);
        }
      };

      const onScanFailure = (error) => {
        // Hanya log error yang bukan dari user cancel
        if (!error.includes('NotFoundException')) {
          console.debug('Scan failure:', error);
        }
      };

      newScanner.render(onScanSuccess, onScanFailure);
      setScanner(newScanner);
    } catch (error) {
      console.error('Scanner init error:', error);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
      showToast.error('Gagal menginisialisasi scanner');
    }
  }, [isScanning, scanner, processing]);

  // Start/stop scanner
  useEffect(() => {
    if (isScanning) {
      initScanner();
    } else if (scanner) {
      scanner.clear().catch(console.error);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isScanning, initScanner, scanner]);

  // Handle check-in confirmation
  const handleCheckinConfirm = async () => {
    if (!participantToCheckin) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          status_kehadiran: true,
          waktu_checkin: new Date().toISOString(),
        })
        .eq('id', participantToCheckin.id);

      if (error) throw error;

      // Update local state
      setScanResult({
        ...participantToCheckin,
        status_kehadiran: true,
        waktu_checkin: new Date().toISOString(),
      });

      showToast.success(
        `Check-in berhasil! Selamat datang, ${participantToCheckin.nama}`
      );

      // Reset setelah 3 detik
      setTimeout(() => {
        setShowConfirmModal(false);
        setParticipantToCheckin(null);
        setScanResult(null);
        setIsScanning(true);
        setProcessing(false);
      }, 3000);
    } catch (error) {
      console.error('Check-in error:', error);
      showToast.error('Gagal melakukan check-in: ' + error.message);
      setProcessing(false);
      setShowConfirmModal(false);
      setIsScanning(true);
    }
  };

  const handleCancelCheckin = () => {
    setShowConfirmModal(false);
    setParticipantToCheckin(null);
    setIsScanning(true);
  };

  const handleReset = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setScanResult(null);
    setParticipantToCheckin(null);
    setIsScanning(true);
    setCameraError(null);
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari Mode Admin?')) {
      localStorage.removeItem('musma_admin_session');
      showToast.info('Anda telah logout dari admin');
      navigate('/');
    }
  };

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
                <QrCode className="w-7 h-7 text-blue-600" />
                Scan Presensi QR Code
              </h1>
              <p className="text-gray-600">
                Scan QR code peserta untuk check-in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Scanner
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          {/* Status Banner */}
          <div
            className={`py-4 text-center font-bold ${
              isScanning
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                : scanResult
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {isScanning ? (
                <>
                  <Camera className="w-6 h-6" />
                  <span className="text-lg">SCANNING AKTIF</span>
                </>
              ) : scanResult ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg">CHECK-IN BERHASIL</span>
                </>
              ) : (
                <>
                  <CameraOff className="w-6 h-6" />
                  <span className="text-lg">SCANNING PAUSED</span>
                </>
              )}
            </div>
          </div>

          <div className="p-8">
            {/* Camera Error */}
            {cameraError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-bold text-red-800">Error Kamera</h3>
                    <p className="text-red-700">{cameraError}</p>
                    <button
                      onClick={handleReset}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Coba lagi →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scanner Container */}
            <div className="mb-6">
              {isScanning ? (
                <div className="text-center">
                  <div id="reader" className="w-full max-w-md mx-auto"></div>
                  <p className="mt-4 text-gray-600">
                    Arahkan kamera ke QR code peserta
                  </p>
                  <div className="mt-2 text-sm text-gray-500">
                    Scanner akan otomatis mendeteksi QR code
                  </div>
                </div>
              ) : scanResult ? (
                /* Success View */
                <div className="text-center animate-in fade-in duration-300">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Check-in Berhasil!
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Scanner akan aktif kembali dalam 3 detik...
                  </p>
                </div>
              ) : (
                /* Scanner Paused View */
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CameraOff className="w-12 h-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Scanner Dijeda
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Menunggu konfirmasi check-in...
                  </p>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-2 mx-auto"
                  >
                    <Camera className="w-5 h-5" />
                    Lanjutkan Scanning
                  </button>
                </div>
              )}
            </div>

            {/* Success Result Details */}
            {scanResult && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Detail Peserta
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-green-600" />
                        <label className="text-sm font-medium text-green-700">
                          Nama Peserta
                        </label>
                      </div>
                      <div className="px-4 py-3 bg-white border border-green-200 rounded-lg font-medium">
                        {scanResult.nama}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-green-600" />
                        <label className="text-sm font-medium text-green-700">
                          NIM
                        </label>
                      </div>
                      <div className="px-4 py-3 bg-white border border-green-200 rounded-lg font-mono">
                        {scanResult.nim}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-green-600" />
                        <label className="text-sm font-medium text-green-700">
                          Kelas
                        </label>
                      </div>
                      <div className="px-4 py-3 bg-white border border-green-200 rounded-lg font-bold text-center text-lg">
                        {scanResult.kelas}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-700">
                        Waktu Check-in
                      </label>
                      <div className="px-4 py-3 bg-white border border-green-200 rounded-lg text-sm">
                        {new Date(scanResult.waktu_checkin).toLocaleString(
                          'id-ID'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Instruksi Scanning</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    1
                  </div>
                  <span>Pastikan kamera memiliki pencahayaan yang cukup</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    2
                  </div>
                  <span>Posisikan QR code dalam kotak scanner</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    3
                  </div>
                  <span>Tunggu hingga scanner mendeteksi secara otomatis</span>
                </li>
              </ul>
            </div>
            <div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    4
                  </div>
                  <span>Konfirmasi check-in sebelum memproses</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    5
                  </div>
                  <span>
                    Scanner akan aktif kembali setelah check-in berhasil
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    6
                  </div>
                  <span>
                    Untuk masalah teknis, tekan tombol "Reset Scanner"
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && participantToCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    Konfirmasi Check-in
                  </h3>
                  <p className="text-sm text-gray-600">
                    Lanjutkan check-in untuk peserta:
                  </p>
                </div>
              </div>

              {/* Participant Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {participantToCheckin.nama}
                  </div>
                  <div className="font-mono text-gray-700">
                    {participantToCheckin.nim}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-medium text-gray-600">Kelas</div>
                    <div className="font-bold text-gray-900">
                      {participantToCheckin.kelas}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="font-medium text-gray-600">Status</div>
                    <div className="font-bold text-green-600">
                      Belum Check-in
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Pastikan identitas peserta sudah sesuai sebelum melanjutkan.
                    Check-in tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelCheckin}
                  disabled={processing}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Batalkan
                </button>
                <button
                  onClick={handleCheckinConfirm}
                  disabled={processing}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Check-in
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

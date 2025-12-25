import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  QrCode,
  ArrowLeft,
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
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanner, setScanner] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [participantToCheckin, setParticipantToCheckin] = useState(null);
  const [manualNim, setManualNim] = useState('');
  const [eventConfig, setEventConfig] = useState({});

  // Cek session admin
  useEffect(() => {
    const token = localStorage.getItem('musma_admin_token');
    if (token !== 'SECRET_KEY_HIMATIF_2025_SECURE_X99') {
      showToast.error('Akses ditolak. Harap login sebagai admin.');
      localStorage.removeItem('musma_admin_token');
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('event_config').select('*');
      if (data) {
        const configMap = {};
        data.forEach((item) => {
          configMap[item.config_key] = item.config_value;
        });
        setEventConfig(configMap);
      }
    };
    fetchConfig();
  }, []);

  const isCheckInTimeValid = useCallback(() => {
    if (!eventConfig || !eventConfig.event_date) return true;

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');

    if (eventConfig.event_date !== todayStr) {
      showToast.error(
        `Presensi DITOLAK. Jadwal acara: ${eventConfig.event_date}, Hari ini: ${todayStr}`
      );
      return false;
    }
    const currentTime = now.toTimeString().slice(0, 5);

    // Cek Jam Mulai
    if (
      eventConfig.presensi_start &&
      currentTime < eventConfig.presensi_start
    ) {
      showToast.error(
        `Presensi BELUM DIBUKA. Jadwal mulai: ${eventConfig.presensi_start} WIB`
      );
      return false;
    }

    // Cek Jam Selesai
    if (eventConfig.presensi_end && currentTime > eventConfig.presensi_end) {
      showToast.error(
        `Presensi SUDAH DITUTUP. Jadwal selesai: ${eventConfig.presensi_end} WIB`
      );
      return false;
    }

    // Jika lolos semua pengecekan
    return true;
  }, [eventConfig]);

  // Initialize scanner
  const initScanner = useCallback(() => {
    if (!isScanning || scanner) return;

    try {
      // Adjust QR box size for mobile
      const isMobile = window.innerWidth < 768;
      const qrboxSize = isMobile ? 200 : 250;

      const newScanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      // Di bagian onScanSuccess function, perbaiki menjadi:
      const onScanSuccess = async (decodedText) => {
        if (processing || !isScanning) return;

        if (!isCheckInTimeValid()) {
          newScanner.pause();
          setTimeout(() => newScanner.resume(), 3000);
          return;
        }

        try {
          // Parse QR data
          let participantId = decodedText;

          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.id) participantId = parsed.id;
          } catch {
            // Bukan JSON
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
            // PASTIKAN showToast.warning ADA atau ganti dengan:
            if (showToast.warning) {
              showToast.warning(`${data.nama} sudah check-in sebelumnya`);
            } else if (showToast.error) {
              showToast.error(`${data.nama} sudah check-in sebelumnya`);
            } else if (showToast.info) {
              showToast.info(`${data.nama} sudah check-in sebelumnya`);
            }
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
  }, [isScanning, scanner, processing, isCheckInTimeValid]);

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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualNim.trim()) return;

    if (!isCheckInTimeValid()) return;

    // Optional: Set processing true biar tombol gak bisa diklik double
    setProcessing(true);

    try {
      // 1. Cari user berdasarkan NIM (Bukan ID)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('nim', manualNim.trim()) // Pastikan kolom di DB adalah 'nim'
        .single();

      if (error || !data) {
        throw new Error('NIM tidak ditemukan dalam database.');
      }

      // 2. Cek apakah sudah check-in (Logic sama dengan scanner)
      if (data.status_kehadiran) {
        showToast.error(`Gagal: ${data.nama} sudah check-in sebelumnya.`);
        setProcessing(false);
        return;
      }

      // 3. Jika Valid, matikan scanner & buka modal konfirmasi
      if (scanner) {
        scanner.clear().catch(console.error); // Stop kamera biar hemat resource
      }
      setIsScanning(false);
      setParticipantToCheckin(data);
      setShowConfirmModal(true);
      setManualNim(''); // Reset input field
    } catch (error) {
      console.error('Manual check-in error:', error);
      showToast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  Scan Presensi QR
                </h1>
                <p className="text-gray-600 text-xs sm:text-base">
                  Scan QR code peserta untuk check-in
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleReset}
                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Reset</span>
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
          </div>

          {/* Scanner Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-4 sm:mb-8">
            {/* Status Banner */}
            <div
              className={`py-3 sm:py-4 text-center font-bold ${
                isScanning
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : scanResult
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {isScanning ? (
                  <>
                    <span className="text-sm sm:text-lg">SCANNING AKTIF</span>
                  </>
                ) : scanResult ? (
                  <>
                    <span className="text-sm sm:text-lg">
                      CHECK-IN BERHASIL
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-lg">SCANNING PAUSED</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-8">
              {/* Camera Error */}
              {cameraError && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800 text-sm sm:text-base">
                        Error Kamera
                      </h3>
                      <p className="text-red-700 text-xs sm:text-sm">
                        {cameraError}
                      </p>
                      <button
                        onClick={handleReset}
                        className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Coba lagi →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanner Container */}
              <div className="mb-4 sm:mb-6">
                {isScanning ? (
                  <div className="text-center">
                    <div id="reader" className="w-full max-w-md mx-auto"></div>
                    <p className="mt-3 sm:mt-4 text-gray-600 text-sm sm:text-base">
                      Arahkan kamera ke QR code peserta
                    </p>
                    <div className="mt-6 pt-6 border-t border-gray-100 w-full max-w-xs mx-auto">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Atau Input Manual
                      </p>
                      <form
                        onSubmit={handleManualSubmit}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Ketik NIM..."
                          value={manualNim}
                          onChange={(e) => setManualNim(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <button
                          type="submit"
                          disabled={processing || !manualNim}
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm font-medium disabled:opacity-50"
                        >
                          Cek
                        </button>
                      </form>
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-gray-500">
                      Scanner akan otomatis mendeteksi QR code
                    </div>
                  </div>
                ) : scanResult ? (
                  /* Success View */
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-600" />
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                      Check-in Berhasil!
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-8">
                      Scanner akan aktif kembali dalam 3 detik...
                    </p>
                  </div>
                ) : (
                  /* Scanner Paused View */
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <CameraOff className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                      Scanner Dijeda
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                      Menunggu konfirmasi check-in...
                    </p>
                    <button
                      onClick={() => setIsScanning(true)}
                      className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-2 mx-auto text-sm sm:text-base"
                    >
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                      Lanjutkan Scanning
                    </button>
                  </div>
                )}
              </div>

              {/* Success Result Details */}
              {scanResult && (
                <div className="mt-4 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <h3 className="font-bold text-green-800 text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Detail Peserta
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <label className="text-xs sm:text-sm font-medium text-green-700">
                            Nama Peserta
                          </label>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-green-200 rounded-lg font-medium text-sm sm:text-base">
                          {scanResult.nama}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <label className="text-xs sm:text-sm font-medium text-green-700">
                            NIM
                          </label>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-green-200 rounded-lg font-mono text-sm sm:text-base">
                          {scanResult.nim}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <label className="text-xs sm:text-sm font-medium text-green-700">
                            Kelas
                          </label>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-green-200 rounded-lg font-bold text-center text-base sm:text-lg">
                          {scanResult.kelas}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-green-700">
                          Waktu Check-in
                        </label>
                        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-green-200 rounded-lg text-xs sm:text-sm">
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
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
              Instruksi Scanning
            </h3>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      1
                    </div>
                    <span>Pastikan kamera memiliki pencahayaan yang cukup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      2
                    </div>
                    <span>Posisikan QR code dalam kotak scanner</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      3
                    </div>
                    <span>
                      Tunggu hingga scanner mendeteksi secara otomatis
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      4
                    </div>
                    <span>Konfirmasi check-in sebelum memproses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      5
                    </div>
                    <span>
                      Scanner akan aktif kembali setelah check-in berhasil
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
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
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && participantToCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                    Konfirmasi Check-in
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Lanjutkan check-in untuk peserta:
                  </p>
                </div>
              </div>

              {/* Participant Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {participantToCheckin.nama}
                  </div>
                  <div className="font-mono text-gray-700 text-sm sm:text-base">
                    {participantToCheckin.nim}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
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
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-amber-700">
                    Pastikan identitas peserta sudah sesuai sebelum melanjutkan.
                    Check-in tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCancelCheckin}
                  disabled={processing}
                  className="flex-1 py-2.5 sm:py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Batal</span>
                </button>
                <button
                  onClick={handleCheckinConfirm}
                  disabled={processing}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Check-in</span>
                    </>
                  )}
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

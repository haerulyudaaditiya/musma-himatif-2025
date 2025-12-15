import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import { checkVotingAvailability } from '../utils/timeCheck';
import {
  CheckCircle,
  XCircle,
  Vote,
  User,
  Mail,
  Hash,
  Users,
  Calendar,
  Clock,
  MapPin,
  Info,
  AlertCircle,
  Eye,
  X,
  ZoomIn,
  Phone,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TicketPage() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingAvailability, setVotingAvailability] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [eventConfig, setEventConfig] = useState({
    event_date_display: 'Tanggal belum ditentukan',
    event_time_display: 'Waktu belum ditentukan',
    event_location: 'Lokasi belum ditentukan',
    contact_phone: 'Kontak belum tersedia',
    contact_email: 'Email belum tersedia',
  });

  const fetchEventConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_config')
        .select('config_key, config_value')
        .eq('is_active', true)
        .in('config_key', [
          'event_date_display',
          'event_time_display',
          'event_location',
          'contact_phone',
          'contact_email',
        ]);

      if (error) throw error;

      if (data) {
        const configMap = {};
        data.forEach((item) => {
          configMap[item.config_key] = item.config_value;
        });
        setEventConfig((prev) => ({ ...prev, ...configMap }));
      }
    } catch (error) {
      console.error('Error fetching event config:', error);
      // Tetap gunakan nilai default jika terjadi error
    }
  }, []);

  const fetchParticipant = useCallback(async () => {
    const savedNim = localStorage.getItem('musma_nim');
    const savedUserId = localStorage.getItem('musma_user_id'); 

    if (!savedNim) {
      showToast.error('Sesi habis, silakan daftar ulang');
      navigate('/');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('nim', savedNim)
        .single();

      if (error || !data) {
        // Fallback: coba dengan user_id jika ada
        if (savedUserId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', savedUserId)
            .single();

          if (userError || !userData) {
            throw new Error('Data tidak ditemukan');
          }
          setParticipant(userData);
        } else {
          throw new Error('Data tidak ditemukan');
        }
      } else {
        setParticipant(data);
      }

      const availability = await checkVotingAvailability();
      setVotingAvailability(availability);
    } catch (error) {
      showToast.error(error.message);
      localStorage.removeItem('musma_nim');
      localStorage.removeItem('musma_user_id'); 
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchEventConfig();
    fetchParticipant();
  }, [fetchEventConfig, fetchParticipant]);

  const getVotingAction = () => {
    if (!participant || !votingAvailability) return null;

    const status = participant.sudah_vote
      ? 'already_voted'
      : !participant.status_kehadiran
        ? 'not_checked_in'
        : votingAvailability.status;

    return {
      status,
      canVote:
        participant.status_kehadiran &&
        !participant.sudah_vote &&
        votingAvailability.status === 'active',
      buttonText: participant.sudah_vote
        ? 'SUDAH MENGGUNAKAN HAK SUARA'
        : !participant.status_kehadiran
          ? 'MENUNGGU CHECK-IN'
          : votingAvailability.status === 'active'
            ? 'MASUK BILIK SUARA'
            : 'MENUNGGU WAKTU VOTING',
      message: participant.sudah_vote
        ? 'Terima kasih telah menggunakan hak suara Anda'
        : !participant.status_kehadiran
          ? 'Check-in dulu di venue'
          : votingAvailability.message,
    };
  };

  const votingAction = getVotingAction();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Memuat tiket digital...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!participant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Tiket Digital MUSMA
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Himpunan Mahasiswa Teknik Informatika - UBP Karawang
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Ticket Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Status Banner */}
                <div
                  className={`py-3 text-center font-bold ${
                    participant.status_kehadiran
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {participant.status_kehadiran ? (
                      <>
                        <span className="text-sm sm:text-base">
                          SUDAH CHECK-IN
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm sm:text-base">
                          BELUM CHECK-IN
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {/* Participant Info */}
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-sm sm:text-base">
                            Informasi Peserta
                          </span>
                        </h2>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="text-xs sm:text-sm font-medium text-gray-700">
                                Nama Lengkap
                              </label>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium text-sm sm:text-base">
                              {participant.nama}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="text-xs sm:text-sm font-medium text-gray-700">
                                NIM
                              </label>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-medium text-sm sm:text-base">
                              {participant.nim}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="text-xs sm:text-sm font-medium text-gray-700">
                                Email
                              </label>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm break-all">
                              {participant.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Class Info */}
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <label className="text-xs sm:text-sm font-medium text-gray-700">
                            Kelas Perwakilan
                          </label>
                        </div>
                        <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                          <div className="text-center">
                            <div className="text-xl sm:text-2xl font-bold text-blue-700 mb-1">
                              {participant.kelas}
                            </div>
                            <div className="text-xs sm:text-sm text-blue-600">
                              Angkatan 20
                              {participant.kelas.match(/IF-(\d{2})/)?.[1]}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="relative">
                      <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-center items-center mb-3">
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center">
                            <span className="text-sm sm:text-base">
                              QR Code Check-in
                            </span>
                          </h2>
                        </div>

                        <div className="flex justify-center mb-3">
                          <button
                            onClick={() => setShowQRModal(true)}
                            className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <QRCode
                              value={participant.id}
                              size={120}
                              level="H"
                              className="w-full h-auto"
                            />
                          </button>
                        </div>

                        <div className="text-center space-y-2">
                          <p className="text-xs sm:text-sm text-gray-600">
                            Tunjukkan QR code ini ke panitia
                          </p>
                          <div className="text-xs text-gray-500">
                            ID: {participant.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voting Status */}
                  {votingAction && (
                    <div className="mb-6">
                      <div
                        className={`p-4 sm:p-6 rounded-xl ${
                          votingAction.canVote
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                            : votingAction.status === 'already_voted'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                              votingAction.canVote
                                ? 'bg-green-100 text-green-600'
                                : votingAction.status === 'already_voted'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {votingAction.canVote ? (
                              <Vote className="w-5 h-5 sm:w-6 sm:h-6" />
                            ) : votingAction.status === 'already_voted' ? (
                              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            ) : (
                              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-bold text-base sm:text-lg mb-1">
                              {votingAction.status === 'already_voted'
                                ? 'Sudah Menggunakan Hak Suara'
                                : votingAction.status === 'not_checked_in'
                                ? 'Belum Check-in'
                                : votingAvailability?.status === 'active'
                                ? 'Siap Memilih'
                                : votingAvailability?.status === 'too_early'
                                ? 'Menunggu Waktu Voting'
                                : votingAvailability?.status === 'too_late'
                                ? 'Voting Ditutup'
                                : 'Status Voting'}
                            </h3>
                            <p className="text-gray-700 text-sm sm:text-base">
                              {votingAction.message}
                            </p>

                            {votingAvailability &&
                              votingAvailability.status === 'active' &&
                              !participant.sudah_vote && (
                                <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium leading-none">
                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                  <span>Voting sedang berlangsung</span>
                                </div>
                              )}
                          </div>

                          {votingAction.canVote && (
                            <button
                              onClick={() => navigate('/vote')}
                              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                              <Vote className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>Masuk Bilik Suara</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Voting Button - hanya jika bisa vote */}
                    {votingAction?.canVote && (
                      <button
                        onClick={() => navigate('/vote')}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Vote className="w-4 h-4 sm:w-5 sm:h-5" />
                        Masuk Bilik Suara
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4 sm:space-y-6">
              {/* Event Info Card */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                  Informasi Acara
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-700 text-xs sm:text-sm">
                        Tanggal
                      </div>
                      <div className="text-gray-800 text-sm sm:text-base">
                        {eventConfig.event_date_display}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-700 text-xs sm:text-sm">
                        Waktu
                      </div>
                      <div className="text-gray-800 text-sm sm:text-base">
                        {eventConfig.event_time_display}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-700 text-xs sm:text-sm">
                        Lokasi
                      </div>
                      <div className="text-gray-800 text-sm sm:text-base">
                        {eventConfig.event_location}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions Card */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                  Instruksi
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      1
                    </div>
                    <span>Tunjukkan QR code saat check-in di venue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      2
                    </div>
                    <span>Check-in wajib dilakukan sebelum voting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      3
                    </div>
                    <span>Gunakan hak suara setelah check-in</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                      4
                    </div>
                    <span>Simpan tiket ini untuk keperluan verifikasi</span>
                  </li>
                </ul>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                  Bantuan
                </h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-700">
                        Panitia MUSMA:
                      </div>
                      <div className="text-gray-600">
                        {eventConfig.contact_phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-700">Email:</div>
                      <div className="text-gray-600 break-words">
                        {eventConfig.contact_email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 mb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">
                  QR Code Check-in
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <QRCode value={participant.id} size={200} level="H" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {participant.nama}
                  </div>
                  <div className="text-gray-600 font-mono">
                    {participant.nim}
                  </div>
                  <div className="text-blue-600 font-bold mt-1">
                    {participant.kelas}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-blue-800 text-xs">
                    <strong>Instruksi:</strong> Tunjukkan QR code ini kepada
                    panitia untuk check-in. Pastikan QR code terlihat jelas di
                    layar.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    // Function untuk print/save QR
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Tiket MUSMA - ${participant.nama}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                            .ticket { max-width: 300px; margin: 0 auto; }
                            .qr-code { margin: 20px 0; }
                            .event-info { margin: 10px 0; font-size: 14px; color: #666; }
                            @media print { .no-print { display: none; } }
                          </style>
                        </head>
                        <body>
                          <div class="ticket">
                            <h2>TIKET MUSMA</h2>
                            <div class="event-info">
                              <p><strong>${eventConfig.event_date_display}</strong></p>
                              <p>${eventConfig.event_time_display}</p>
                              <p>${eventConfig.event_location}</p>
                            </div>
                            <p><strong>${participant.nama}</strong></p>
                            <p>${participant.nim}</p>
                            <p>${participant.kelas}</p>
                            <div class="qr-code">
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${participant.id}" alt="QR Code">
                            </div>
                            <p><em>Tunjukkan QR code ini saat check-in</em></p>
                            <p class="contact-info">
                              Panitia: ${eventConfig.contact_phone}<br/>
                              Email: ${eventConfig.contact_email}
                            </p>
                          </div>
                          <div class="no-print">
                            <button onclick="window.print()">Cetak</button>
                            <button onclick="window.close()">Tutup</button>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow text-sm"
                >
                  Simpan/Cetak
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

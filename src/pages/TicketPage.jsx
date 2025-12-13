import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import { checkVotingAvailability } from '../utils/timeCheck';
import {
  LogOut,
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
} from 'lucide-react';

export default function TicketPage() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingAvailability, setVotingAvailability] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fetchParticipant = useCallback(async () => {
    const savedNim = localStorage.getItem('musma_nim');

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
        throw new Error('Data tidak ditemukan');
      }

      setParticipant(data);

      // Cek ketersediaan voting
      const availability = await checkVotingAvailability();
      setVotingAvailability(availability);
    } catch (error) {
      showToast.error(error.message);
      localStorage.removeItem('musma_nim');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  const confirmLogout = () => {
    localStorage.removeItem('musma_nim');
    localStorage.removeItem('musma_nama');
    showToast.info('Anda telah logout');
    navigate('/');
    setShowLogoutModal(false);
  };

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
          ? 'Harap check-in terlebih dahulu di venue'
          : votingAvailability.message,
    };
  };

  const votingAction = getVotingAction();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat tiket digital...
          </p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Tiket Digital MUSMA
          </h1>
          <p className="text-gray-600">
            Himpunan Mahasiswa Teknik Informatika - UBP Karawang
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Ticket Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Status Banner */}
              <div
                className={`py-4 text-center font-bold ${
                  participant.status_kehadiran
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  {participant.status_kehadiran ? (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      <span className="text-lg">SUDAH CHECK-IN</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" />
                      <span className="text-lg">BELUM CHECK-IN</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8">
                {/* Participant Info */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Personal Info */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Informasi Peserta
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700">
                              Nama Lengkap
                            </label>
                          </div>
                          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-medium">
                            {participant.nama}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700">
                              NIM
                            </label>
                          </div>
                          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono font-medium">
                            {participant.nim}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700">
                              Email
                            </label>
                          </div>
                          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm break-all">
                            {participant.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <label className="text-sm font-medium text-gray-700">
                          Kelas Perwakilan
                        </label>
                      </div>
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700 mb-1">
                            {participant.kelas}
                          </div>
                          <div className="text-sm text-blue-600">
                            Angkatan 20
                            {participant.kelas.match(/IF-(\d{2})/)?.[1]}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      QR Code Check-in
                    </h2>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                          <QRCode value={participant.id} size={180} level="H" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">
                          Tunjukkan QR code ini ke panitia saat check-in
                        </p>
                        <div className="text-xs text-gray-500">
                          ID: {participant.id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Status */}
                {votingAction && (
                  <div className="mb-8">
                    <div
                      className={`p-6 rounded-xl ${
                        votingAction.canVote
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                          : votingAction.status === 'already_voted'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            votingAction.canVote
                              ? 'bg-green-100 text-green-600'
                              : votingAction.status === 'already_voted'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {votingAction.canVote ? (
                            <Vote className="w-6 h-6" />
                          ) : votingAction.status === 'already_voted' ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <AlertCircle className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-1">
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
                          <p className="text-gray-700">
                            {votingAction.message}
                          </p>

                          {votingAvailability &&
                            votingAvailability.status === 'active' &&
                            !participant.sudah_vote && (
                              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Voting sedang berlangsung
                              </div>
                            )}
                        </div>

                        {votingAction.canVote && (
                          <button
                            onClick={() => navigate('/vote')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center gap-2"
                          >
                            <Vote className="w-5 h-5" />
                            Masuk Bilik Suara
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-4">
                  {/* Voting Button - hanya jika bisa vote */}
                  {votingAction?.canVote && (
                    <button
                      onClick={() => navigate('/vote')}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Vote className="w-5 h-5" />
                      Masuk Bilik Suara
                    </button>
                  )}

                  {/* Quick Count Button - hanya setelah vote */}
                  {participant.sudah_vote && (
                    <button
                      onClick={() => navigate('/results')}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Lihat Hasil Quick Count
                    </button>
                  )}

                  {/* Logout Button - selalu ada */}
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Keluar Akun
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Event Info Card */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Informasi Acara
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-700">Tanggal</div>
                    <div className="text-gray-800">Sabtu, 28 Desember 2024</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-700">Waktu</div>
                    <div className="text-gray-800">08:00 - 15:00 WIB</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-700">Lokasi</div>
                    <div className="text-gray-800">Auditorium UBP Karawang</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions Card */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Instruksi
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    1
                  </div>
                  <span>Tunjukkan QR code saat check-in di venue</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    2
                  </div>
                  <span>Check-in wajib dilakukan sebelum voting</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    3
                  </div>
                  <span>Gunakan hak suara setelah check-in</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                    4
                  </div>
                  <span>Simpan tiket ini untuk keperluan verifikasi</span>
                </li>
              </ul>
            </div>

            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Bantuan
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">
                    Panitia MUSMA:
                  </div>
                  <div className="text-gray-600">0857-XXXX-XXXX</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Email:</div>
                  <div className="text-gray-600">himatif@ubpkarawang.ac.id</div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Hubungi panitia jika mengalami kendala teknis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Logout</h3>
                  <p className="text-sm text-gray-600">Keluar dari akun ini?</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

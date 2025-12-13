// src/pages/HomePage.jsx
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Vote,
  BarChart3,
  QrCode,
  Shield,
  ArrowRight,
  Calendar,
  MapPin,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('musma_admin_session');
  const hasTicket = localStorage.getItem('musma_nim');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-8 shadow-lg">
          <Vote className="w-10 h-10 text-blue-600" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Sistem Voting Digital{' '}
          <span className="text-blue-600">MUSMA 2024</span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Himpunan Mahasiswa Teknik Informatika - UBP Karawang
          <br />
          <span className="text-lg">
            Memilih dengan transparan, aman, dan modern
          </span>
        </p>

        {/* Event Info */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-700">Tanggal</div>
                  <div className="font-semibold">Sabtu, 28 Desember 2024</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-700">Lokasi</div>
                  <div className="font-semibold">Auditorium UBP Karawang</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {/* Daftar/Login Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {hasTicket ? 'Masuk ke Tiket Anda' : 'Daftar sebagai Perwakilan'}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasTicket
                ? 'Akses tiket digital dan gunakan hak suara Anda'
                : 'Daftarkan diri Anda sebagai perwakilan kelas untuk MUSMA 2024'}
            </p>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
            >
              {hasTicket ? 'LIHAT TIKET SAYA' : 'DAFTAR/MASUK SEKARANG'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Count Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Hasil Quick Count
            </h3>
            <p className="text-gray-600 mb-6">
              Pantau perkembangan perolehan suara kandidat secara real-time
            </p>
            <button
              onClick={() => {
                if (hasTicket) {
                  navigate('/results');
                } else {
                  alert(
                    'Silakan daftar/login terlebih dahulu untuk melihat hasil'
                  );
                }
              }}
              className={`w-full py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                hasTicket
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow hover:shadow-md'
                  : 'border-2 border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              LIHAT HASIL VOTING
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Access */}
        {isAdmin && (
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-800">
                    Admin Mode Terdeteksi
                  </h3>
                  <p className="text-blue-600 text-sm">
                    Anda login sebagai administrator
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/admin/scan')}
                  className="flex-1 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Scan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Mengapa Sistem Digital?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 text-blue-600">⚡</div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                Cepat & Real-time
              </h3>
              <p className="text-gray-600">
                Hasil voting langsung terupdate tanpa delay
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 text-green-600">🔒</div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                Aman & Transparan
              </h3>
              <p className="text-gray-600">
                Satu orang satu suara, terjamin keasliannya
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 text-purple-600">📱</div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Paperless</h3>
              <p className="text-gray-600">
                Ramah lingkungan, tidak butuh kertas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 mb-2">
            © 2024 HIMATIF UBP Karawang - All rights reserved
          </p>
          <p className="text-gray-500 text-sm">
            Sistem Voting Digital MUSMA 2024 | Teknik Informatika
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Untuk bantuan teknis, hubungi: himatif@ubpkarawang.ac.id
          </p>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient'; // Pastikan path lib sesuai struktur folder Anda

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // State untuk menyimpan daftar kelas dari database
  const [listKelas, setListKelas] = useState([]);

  // State Form Data (Termasuk Email)
  const [formData, setFormData] = useState({
    nim: '',
    nama: '',
    email: '',
    kelas: '',
  });

  // --- 1. Ambil Data Kelas dari Supabase (Dinamis) ---
  useEffect(() => {
    const fetchKelas = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('nama_kelas', { ascending: true });

      if (error) {
        console.error('Gagal ambil data kelas:', error);
      } else {
        setListKelas(data);
      }
    };

    fetchKelas();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 2. Logika Submit Pendaftaran ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // A. Validasi Input Kosong
      if (!formData.kelas) {
        throw new Error('Silakan pilih kelas terlebih dahulu!');
      }
      if (!formData.nim || !formData.nama || !formData.email) {
        throw new Error('NIM, Nama, dan Email wajib diisi!');
      }

      // B. Validasi Format Email (Regex Professional)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Format email tidak valid! (Contoh: user@ubp.ac.id)');
      }

      // C. CEK KUOTA KELAS (Max 2 Orang)
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('kelas', formData.kelas);

      if (countError) throw countError;

      if (count >= 2) {
        throw new Error(
          `Mohon maaf, kuota perwakilan kelas ${formData.kelas} sudah penuh (2/2 orang).`
        );
      }

      // D. CEK DUPLIKASI (NIM atau EMAIL)
      // Menggunakan logic .or() agar satu query bisa cek dua kolom sekaligus
      const { data: existingUser } = await supabase
        .from('users')
        .select('nim, email')
        .or(`nim.eq.${formData.nim},email.eq.${formData.email}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.nim === formData.nim) {
          throw new Error('NIM ini sudah terdaftar sebelumnya!');
        }
        if (existingUser.email === formData.email) {
          throw new Error('Email ini sudah digunakan oleh peserta lain!');
        }
      }

      // E. SIMPAN DATA KE DATABASE
      const { error: insertError } = await supabase.from('users').insert([
        {
          nim: formData.nim,
          nama: formData.nama,
          email: formData.email, // Simpan email
          kelas: formData.kelas,
        },
      ]);

      if (insertError) throw insertError;

      // F. SUKSES & REDIRECT
      // Simpan sesi NIM di localStorage agar halaman Tiket bisa mengenalinya
      localStorage.setItem('musma_nim', formData.nim);

      alert('Pendaftaran Berhasil! Mengalihkan ke tiket...');
      navigate('/ticket'); // Pindah ke halaman tiket
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <div className="text-center mb-4">
            <h2 className="card-title text-2xl font-bold justify-center">
              Pendaftaran Musma
            </h2>
            <p className="text-xs text-gray-500">
              Isi data diri dengan benar untuk mendapatkan E-Ticket.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Input NIM */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">NIM</span>
              </label>
              <input
                type="text"
                name="nim"
                placeholder="Nomor Induk Mahasiswa"
                className="input input-bordered w-full"
                value={formData.nim}
                onChange={handleChange}
              />
            </div>

            {/* Input Nama */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Nama Lengkap</span>
              </label>
              <input
                type="text"
                name="nama"
                placeholder="Nama Sesuai KTM"
                className="input input-bordered w-full"
                value={formData.nama}
                onChange={handleChange}
              />
            </div>

            {/* Input Email (BARU) */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Email Aktif</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="contoh@mhs.ubpkarawang.ac.id"
                className="input input-bordered w-full"
                value={formData.email}
                onChange={handleChange}
              />
              <label className="label">
                <span className="label-text-alt text-gray-400">
                  Tiket juga dikirim via email.
                </span>
              </label>
            </div>

            {/* Select Kelas */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Kelas</span>
              </label>
              <select
                name="kelas"
                className="select select-bordered w-full"
                value={formData.kelas}
                onChange={handleChange}
              >
                <option value="" disabled>
                  -- Pilih Kelas Perwakilan --
                </option>
                {listKelas.map((item) => (
                  <option key={item.id} value={item.nama_kelas}>
                    {item.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              className={`btn btn-primary mt-6 w-full font-bold text-lg shadow-lg ${
                loading ? 'loading' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

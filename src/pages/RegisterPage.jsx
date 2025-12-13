import { useState, useEffect } from 'react'; // Tambah useEffect
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // State untuk menyimpan daftar kelas dari database
  const [listKelas, setListKelas] = useState([]);

  const [formData, setFormData] = useState({
    nim: '',
    nama: '',
    kelas: '', // Kosongkan defaultnya biar user wajib pilih
  });

  // --- UPGRADE: Ambil Data Kelas dari Supabase ---
  useEffect(() => {
    const fetchKelas = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('nama_kelas', { ascending: true }); // Urutkan abjad

      if (error) {
        console.error('Gagal ambil data kelas:', error);
      } else {
        setListKelas(data);
      }
    };

    fetchKelas();
  }, []); // Jalan sekali pas halaman dimuat
  // -----------------------------------------------

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi wajib pilih kelas
      if (!formData.kelas) {
        throw new Error('Silakan pilih kelas terlebih dahulu!');
      }
      if (!formData.nim || !formData.nama) {
        throw new Error('NIM dan Nama wajib diisi!');
      }

      // ... (Sisa logika cek kuota sama seperti sebelumnya) ...

      // CEK KUOTA KELAS
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

      // CEK DOUBLE NIM
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('nim', formData.nim)
        .single();

      if (existingUser) {
        throw new Error('NIM ini sudah terdaftar sebelumnya!');
      }

      // SIMPAN DATA
      const { error: insertError } = await supabase.from('users').insert([
        {
          nim: formData.nim,
          nama: formData.nama,
          kelas: formData.kelas,
        },
      ]);

      if (insertError) throw insertError;

      alert('Pendaftaran Berhasil! Silakan simpan QR Code Anda.');
      navigate('/');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-4">
            Pendaftaran Musma
          </h2>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Input NIM & Nama (Sama seperti sebelumnya) */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">NIM</span>
              </label>
              <input
                type="text"
                name="nim"
                placeholder="NIM"
                className="input input-bordered w-full"
                value={formData.nim}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Nama Lengkap</span>
              </label>
              <input
                type="text"
                name="nama"
                placeholder="Nama"
                className="input input-bordered w-full"
                value={formData.nama}
                onChange={handleChange}
              />
            </div>

            {/* Select Kelas Dinamis */}
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
                  -- Pilih Kelas --
                </option>
                {/* Looping data dari Database */}
                {listKelas.map((item) => (
                  <option key={item.id} value={item.nama_kelas}>
                    {item.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className={`btn btn-primary mt-4 w-full ${
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

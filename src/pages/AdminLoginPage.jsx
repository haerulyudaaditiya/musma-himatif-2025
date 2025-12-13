import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState({ username: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Cek ke Database
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', creds.username)
        .eq('password', creds.password) // Password plain text (SKS Mode)
        .single();

      if (error || !data) {
        throw new Error('Username atau Password salah!');
      }

      // Login Sukses
      // Simpan tanda bahwa dia adalah admin
      localStorage.setItem('musma_admin_session', 'true');

      alert('Login Admin Berhasil!');
      navigate('/admin/scan'); // Kita akan buat halaman ini setelahnya
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl mb-4">
            Admin Panel
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={creds.username}
                onChange={(e) =>
                  setCreds({ ...creds, username: e.target.value })
                }
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={creds.password}
                onChange={(e) =>
                  setCreds({ ...creds, password: e.target.value })
                }
              />
            </div>

            <button disabled={loading} className="btn btn-primary mt-4">
              {loading ? 'Masuk...' : 'Login Panitia'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

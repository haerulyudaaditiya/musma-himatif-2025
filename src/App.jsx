import { useEffect, useState } from 'react';
import { supabase } from './libs/supabaseClient'; 

function App() {
  const [status, setStatus] = useState('Mengecek koneksi...');

  useEffect(() => {
    if (supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('Koneksi Supabase Berhasil! Sistem Siap.');
    } else {
      setStatus('Gagal terhubung ke Database.');
    }
  }, []);

  return (
    <>
      <div className="p-10 flex flex-col gap-5 items-center justify-center min-h-screen bg-base-200">
        <h1 className="text-3xl font-bold text-blue-600 underline">
          System Check
        </h1>

        {/* Alert Box DaisyUI */}
        <div role="alert" className="alert alert-info shadow-lg max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span className="font-bold">{status}</span>
        </div>
      </div>
    </>
  );
}

export default App;

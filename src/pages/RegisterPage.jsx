import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  Check,
  Users,
  AlertCircle,
  ArrowRight,
  Calendar,
  Mail,
  User,
  Hash,
  LogIn,
  UserPlus,
} from 'lucide-react';

// Pindahkan keluar dari komponen (atau gunakan useMemo)
const VALID_ANGKATANS = ['2022', '2023', '2024', '2025'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [classCounts, setClassCounts] = useState({});
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('register');
  const [loginNim, setLoginNim] = useState('');
  const [loginErrors, setLoginErrors] = useState({ nim: '' });

  const [formData, setFormData] = useState({
    nim: '',
    nama: '',
    email: '',
    kelas: '',
    angkatan: '',
  });

  const [errors, setErrors] = useState({
    nim: '',
    nama: '',
    email: '',
  });

  // Gunakan useMemo untuk array konstan
  const validAngkatans = useMemo(() => VALID_ANGKATANS, []);

  // Fetch data dari database - SEKALI SAJA
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch semua kelas dari database
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .order('nama_kelas');

        if (classesError) throw classesError;

        // Filter hanya kelas dengan angkatan 22-25
        const filteredClasses =
          classesData?.filter((cls) => {
            const match = cls.nama_kelas.match(/IF-(\d{2})/i);
            if (match) {
              const angkatan = `20${match[1]}`;
              return validAngkatans.includes(angkatan);
            }
            return false;
          }) || [];

        setClasses(filteredClasses);

        // 2. Fetch jumlah peserta per kelas
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('kelas');

        if (usersError) throw usersError;

        const counts = {};
        users?.forEach((user) => {
          counts[user.kelas] = (counts[user.kelas] || 0) + 1;
        });

        setClassCounts(counts);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast.error('Gagal memuat data kelas');
      }
    };

    fetchData();
  }, [validAngkatans]); // Sekarang reference stabil

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'nim': {
        if (!value.trim()) {
          error = 'NIM harus diisi';
        } else if (value.length !== 14) {
          error = 'NIM harus 14 digit';
        } else if (!/^\d+$/.test(value)) {
          error = 'NIM harus berupa angka';
        } else {
          // Validasi angkatan dari NIM
          const nimAngkatan = '20' + value.substring(0, 2);
          if (!validAngkatans.includes(nimAngkatan)) {
            error = `Angkatan ${nimAngkatan} tidak valid. Hanya angkatan 2022-2025`;
          }
        }
        break;
      }

      case 'nama': {
        if (!value.trim()) {
          error = 'Nama harus diisi';
        } else if (value.length < 3) {
          error = 'Nama minimal 3 karakter';
        }
        break;
      }

      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          error = 'Email harus diisi';
        } else if (!emailRegex.test(value)) {
          error = 'Format email tidak valid';
        } else if (!value.includes('mhs.ubpkarawang.ac.id')) {
          error = 'Harus menggunakan email UBP';
        }
        break;
      }
      // no default
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    // Auto-detect angkatan dari NIM (2 digit pertama)
    if (name === 'nim' && value.length >= 2) {
      const year = '20' + value.substring(0, 2);
      updatedData.angkatan = year;

      // Reset kelas jika NIM diubah
      if (formData.kelas) {
        const kelasAngkatan = formData.kelas.match(/IF-(\d{2})/i);
        if (kelasAngkatan && `20${kelasAngkatan[1]}` !== year) {
          updatedData.kelas = '';
          showToast.warning(
            'Kelas direset karena tidak sesuai dengan angkatan NIM'
          );
        }
      }
    }

    // Validasi real-time
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));

    setFormData(updatedData);
  };

  const validateStep1 = () => {
    const newErrors = {
      nim: validateField('nim', formData.nim),
      nama: validateField('nama', formData.nama),
      email: validateField('email', formData.email),
    };

    setErrors(newErrors);

    // Cek jika ada error
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const nextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const proceedWithRegistration = async () => {
    try {
      const { error } = await supabase.from('users').insert([
        {
          nim: formData.nim,
          nama: formData.nama.toUpperCase(),
          email: formData.email.toLowerCase(),
          kelas: formData.kelas,
          status_kehadiran: false,
          sudah_vote: false,
          waktu_daftar: new Date(),
        },
      ]);

      if (error) throw error;

      localStorage.setItem('musma_nim', formData.nim);
      localStorage.setItem('musma_nama', formData.nama);
      localStorage.setItem('musma_kelas', formData.kelas);

      showToast.success('Pendaftaran berhasil! Tiket akan dikirim ke email.');

      setTimeout(() => navigate('/ticket'), 1500);
    } catch (error) {
      showToast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.kelas) {
      showToast.error('Pilih kelas perwakilan terlebih dahulu');
      return;
    }

    // Validasi kecocokan NIM dan Kelas - TIDAK BOLEH MISMATCH
    const nimAngkatan = '20' + formData.nim.substring(0, 2);
    const kelasAngkatan = formData.kelas.match(/IF-(\d{2})/i);

    if (!kelasAngkatan || `20${kelasAngkatan[1]}` !== nimAngkatan) {
      showToast.error('Kelas harus sesuai dengan angkatan NIM Anda');
      return;
    }

    setLoading(true);

    try {
      // 1. Cek kuota per kelas
      const currentCount = classCounts[formData.kelas] || 0;
      if (currentCount >= 2) {
        throw new Error(`Kelas ${formData.kelas} sudah penuh (2/2)`);
      }

      // 2. Cek duplikasi NIM
      const { data: existingNIM } = await supabase
        .from('users')
        .select('nim')
        .eq('nim', formData.nim)
        .single();

      if (existingNIM) {
        throw new Error(`NIM ${formData.nim} sudah terdaftar`);
      }

      // 3. Cek duplikasi Email
      const { data: existingEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .single();

      if (existingEmail) {
        throw new Error('Email sudah digunakan peserta lain');
      }

      await proceedWithRegistration();
    } catch (error) {
      showToast.error(error.message);
      setLoading(false);
    }
  };

  // Group kelas by angkatan (IF-22A, IF-22B, dll)
  const groupedClasses = {};
  classes.forEach((cls) => {
    const match = cls.nama_kelas.match(/IF-(\d{2})/i);
    if (match) {
      const year = `20${match[1]}`;
      if (!groupedClasses[year]) {
        groupedClasses[year] = [];
      }
      groupedClasses[year].push(cls);
    }
  });

  // Hitung statistik
  const availableClasses = classes.filter((cls) => {
    const count = classCounts[cls.nama_kelas] || 0;
    return count < 2;
  }).length;

  const fullClasses = classes.filter((cls) => {
    const count = classCounts[cls.nama_kelas] || 0;
    return count >= 2;
  }).length;

  // Filter kelas yang tersedia berdasarkan angkatan NIM
  const getAvailableClassesForAngkatan = () => {
    if (!formData.angkatan || !validAngkatans.includes(formData.angkatan)) {
      return [];
    }
    return groupedClasses[formData.angkatan] || [];
  };

  const availableClassesForAngkatan = getAvailableClassesForAngkatan();

  const validateLoginField = (name, value) => {
    if (name === 'nim') {
      if (!value.trim()) return 'NIM harus diisi';
      if (value.length !== 14) return 'NIM harus 14 digit';
      if (!/^\d+$/.test(value)) return 'NIM harus berupa angka';
    }
    return '';
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const error = validateLoginField('nim', loginNim);
    setLoginErrors({ nim: error });

    if (error) {
      showToast.error(error);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('nim', loginNim)
        .single();

      if (error || !data) {
        throw new Error('NIM tidak ditemukan. Silakan daftar terlebih dahulu');
      }

      // Simpan session
      localStorage.setItem('musma_nim', data.nim);
      localStorage.setItem('musma_nama', data.nama);
      localStorage.setItem('musma_kelas', data.kelas);

      showToast.success(`Selamat datang kembali, ${data.nama}`);
      navigate('/ticket');
    } catch (error) {
      showToast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Toggle Button */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white rounded-xl shadow border border-gray-200 p-1.5">
            <button
              onClick={() => setMode('register')}
              className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-semibold">Daftar Baru</span>
            </button>
            <button
              onClick={() => setMode('login')}
              className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span className="font-semibold">Sudah Daftar</span>
            </button>
          </div>
        </div>

        {/* Mode Login */}
        {mode === 'login' ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Masuk dengan NIM
              </h2>
              <p className="text-gray-600 mb-8">
                Masukkan NIM yang sudah terdaftar untuk melihat tiket Anda
              </p>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <label className="block text-sm font-medium text-gray-700">
                      NIM
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="23416255200026"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono ${
                      loginErrors.nim ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={loginNim}
                    onChange={(e) => {
                      setLoginNim(e.target.value);
                      // Real-time validation
                      const error = validateLoginField('nim', e.target.value);
                      setLoginErrors({ nim: error });
                    }}
                    maxLength={14}
                  />
                  {loginErrors.nim && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {loginErrors.nim}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    14 digit NIM Anda
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!loginNim || loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memverifikasi...
                    </div>
                  ) : (
                    <>
                      Masuk ke Tiket Saya
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Belum punya tiket?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Daftar sebagai perwakilan baru
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="flex justify-center mb-10">
              <div className="flex items-center bg-white rounded-full px-6 py-3 shadow-sm border border-gray-200">
                <div
                  className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span className="font-medium">Identitas</span>
                </div>

                <div className="w-12 h-0.5 bg-gray-300 mx-4"></div>

                <div
                  className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    2
                  </div>
                  <span className="font-medium">Pilih Kelas</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  {step === 1 ? (
                    <div className="p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Data Diri Peserta
                      </h2>
                      <p className="text-gray-600 mb-8">
                        Isi data diri sesuai dengan KTM/Transkrip
                      </p>

                      <div className="space-y-6">
                        {/* NIM Field */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <label className="block text-sm font-medium text-gray-700">
                              NIM
                            </label>
                          </div>
                          <input
                            type="text"
                            name="nim"
                            placeholder="23416255200026"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono ${
                              errors.nim ? 'border-red-500' : 'border-gray-300'
                            }`}
                            value={formData.nim}
                            onChange={handleChange}
                            maxLength={14}
                          />
                          <div className="flex justify-between mt-2">
                            {formData.angkatan && (
                              <p
                                className={`text-sm font-medium ${
                                  validAngkatans.includes(formData.angkatan)
                                    ? 'text-blue-600'
                                    : 'text-red-600'
                                }`}
                              >
                                Angkatan: {formData.angkatan}
                                {!validAngkatans.includes(formData.angkatan) &&
                                  ' (Tidak valid, hanya angkatan 2022-2025)'}
                              </p>
                            )}
                          </div>
                          {errors.nim && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {errors.nim}
                            </p>
                          )}
                        </div>

                        {/* Nama Field */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <label className="block text-sm font-medium text-gray-700">
                              Nama Lengkap
                            </label>
                          </div>
                          <input
                            type="text"
                            name="nama"
                            placeholder="John Doe"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                              errors.nama ? 'border-red-500' : 'border-gray-300'
                            }`}
                            value={formData.nama}
                            onChange={handleChange}
                          />
                          <div className="flex justify-between mt-1">
                            {errors.nama && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.nama}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Email Field */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <label className="block text-sm font-medium text-gray-700">
                              Email UBP
                            </label>
                          </div>
                          <input
                            type="email"
                            name="email"
                            placeholder="ifxx.nama@mhs.ubpkarawang.ac.id"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                              errors.email
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            value={formData.email}
                            onChange={handleChange}
                          />
                          <div className="flex justify-between mt-2">
                            {errors.email && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={nextStep}
                          disabled={
                            !formData.nim ||
                            !formData.nama ||
                            !formData.email ||
                            errors.nim ||
                            errors.nama ||
                            errors.email ||
                            !validAngkatans.includes(formData.angkatan)
                          }
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Lanjutkan ke Pilihan Kelas
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Pilih Kelas Perwakilan
                          </h2>
                          <p className="text-gray-600">
                            Maksimal 2 perwakilan per kelas
                          </p>
                        </div>
                        <button
                          onClick={() => setStep(1)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ← Edit Data
                        </button>
                      </div>

                      {/* Info Angkatan */}
                      {formData.angkatan && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Users className="w-6 h-6 text-blue-600" />
                              <div>
                                <h3 className="font-bold text-blue-800">
                                  Angkatan {formData.angkatan}
                                </h3>
                                <p className="text-blue-600 text-sm">
                                  Pilih kelas sesuai angkatan Anda
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-blue-700 font-medium">
                              {availableClassesForAngkatan.length} kelas
                              tersedia
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Kelas Selection */}
                      <div className="space-y-8">
                        {formData.angkatan &&
                        validAngkatans.includes(formData.angkatan) ? (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Calendar className="w-5 h-5 text-gray-500" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                Kelas Angkatan {formData.angkatan}
                              </h3>
                            </div>

                            {availableClassesForAngkatan.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {availableClassesForAngkatan.map((cls) => {
                                  const count =
                                    classCounts[cls.nama_kelas] || 0;
                                  const isFull = count >= 2;
                                  const isSelected =
                                    formData.kelas === cls.nama_kelas;

                                  return (
                                    <button
                                      key={cls.id}
                                      type="button"
                                      onClick={() =>
                                        !isFull &&
                                        setFormData((prev) => ({
                                          ...prev,
                                          kelas: cls.nama_kelas,
                                        }))
                                      }
                                      disabled={isFull}
                                      className={`
                                    relative p-4 rounded-xl border-2 text-center transition-all
                                    ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }
                                    ${
                                      isFull
                                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                        : 'cursor-pointer'
                                    }
                                  `}
                                    >
                                      <div className="font-bold text-lg mb-2">
                                        {cls.nama_kelas}
                                      </div>
                                      <div
                                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                                          isFull
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}
                                      >
                                        {count}/2
                                      </div>
                                      {isFull && (
                                        <AlertCircle className="absolute top-2 right-2 w-4 h-4 text-red-500" />
                                      )}
                                      {isSelected && (
                                        <Check className="absolute top-2 right-2 w-4 h-4 text-blue-500" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-gray-50 rounded-xl">
                                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">
                                  Tidak ada kelas tersedia untuk angkatan{' '}
                                  {formData.angkatan}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-red-50 rounded-xl">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                            <p className="text-red-600 font-medium">
                              Angkatan NIM Anda tidak valid. Hanya angkatan
                              2022-2025 yang dapat mendaftar.
                            </p>
                            <button
                              onClick={() => setStep(1)}
                              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                            >
                              ← Kembali ke step 1
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Selected Class Info */}
                      {formData.kelas && (
                        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-green-600" />
                            <div>
                              <h3 className="font-bold text-green-800 text-lg">
                                Kelas Dipilih: {formData.kelas}
                              </h3>
                              <p className="text-green-600">
                                Kuota tersisa:{' '}
                                {2 - (classCounts[formData.kelas] || 0)} dari 2
                                kursi
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={!formData.kelas || loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Memproses Pendaftaran...
                          </div>
                        ) : (
                          'Daftar sebagai Perwakilan'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar - Info */}
              <div className="space-y-6">
                {/* Rules Card */}
                <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Ketentuan</h3>
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                        1
                      </div>
                      <span>
                        Maksimal <strong>2 orang</strong> per kelas
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                        2
                      </div>
                      <span>
                        Total: <strong>54 peserta</strong> (27 kelas)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                        3
                      </div>
                      <span>Email harus aktif (untuk tiket)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                        4
                      </div>
                      <span>Kelas HARUS sesuai dengan angkatan NIM</span>
                    </li>
                  </ul>
                </div>

                {/* Contact Card */}
                <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Bantuan</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">
                        Panitia MUSMA:
                      </div>
                      <div className="text-gray-600">0857-XXXX-XXXX</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Email:</div>
                      <div className="text-gray-600">
                        himatif@ubpkarawang.ac.id
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Tiket digital dikirim via email setelah pendaftaran
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Statistik</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Total Kelas</span>
                        <span className="font-medium">
                          {classes.length} kelas
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(fullClasses / classes.length) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {fullClasses} kelas penuh
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-green-700">
                          {availableClasses}
                        </div>
                        <div className="text-xs text-green-600">Tersedia</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-red-700">
                          {fullClasses}
                        </div>
                        <div className="text-xs text-red-600">Penuh</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

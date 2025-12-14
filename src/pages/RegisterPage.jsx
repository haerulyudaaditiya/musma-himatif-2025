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
  MapPin,
  Vote,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

  const validAngkatans = useMemo(() => VALID_ANGKATANS, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .order('nama_kelas');

        if (classesError) throw classesError;

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
  }, [validAngkatans]);

  const [eventConfig, setEventConfig] = useState({
    event_date_display: 'Tanggal belum ditentukan',
    event_time_display: 'Waktu belum ditentukan',
    event_location: 'Lokasi belum ditentukan',
    contact_phone: 'Kontak belum tersedia',
    contact_email: 'Email belum tersedia',
  });

  // Tambahkan fetchEventConfig di useEffect yang sudah ada atau buat useEffect baru
  useEffect(() => {
    const fetchEventConfig = async () => {
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
      }
    };

    fetchEventConfig();
  }, []);

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
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    if (name === 'nim' && value.length >= 2) {
      const year = '20' + value.substring(0, 2);
      updatedData.angkatan = year;

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

    const nimAngkatan = '20' + formData.nim.substring(0, 2);
    const kelasAngkatan = formData.kelas.match(/IF-(\d{2})/i);

    if (!kelasAngkatan || `20${kelasAngkatan[1]}` !== nimAngkatan) {
      showToast.error('Kelas harus sesuai dengan angkatan NIM Anda');
      return;
    }

    setLoading(true);

    try {
      const currentCount = classCounts[formData.kelas] || 0;
      if (currentCount >= 2) {
        throw new Error(`Kelas ${formData.kelas} sudah penuh (2/2)`);
      }

      const { data: existingNIM } = await supabase
        .from('users')
        .select('nim')
        .eq('nim', formData.nim)
        .single();

      if (existingNIM) {
        throw new Error(`NIM ${formData.nim} sudah terdaftar`);
      }

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

  const availableClasses = classes.filter((cls) => {
    const count = classCounts[cls.nama_kelas] || 0;
    return count < 2;
  }).length;

  const fullClasses = classes.filter((cls) => {
    const count = classCounts[cls.nama_kelas] || 0;
    return count >= 2;
  }).length;

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
      <Header />

      <div className="flex-1">
        {/* Hero Section - Simple */}
        {/* Hero Section - Simple */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 sm:py-6">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col items-center justify-center mb-4 text-center">
              <h1 className="text-lg sm:text-xl font-bold">
                SISTEM VOTING DIGITAL
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm">
                MUSMA HIMATIF 2025 • UBP Karawang
              </p>
            </div>

            <div className="max-w-md mx-auto bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 border border-white/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div className="text-left">
                    <div className="font-medium text-blue-100 text-xs sm:text-sm">
                      Tanggal Acara
                    </div>
                    <div className="font-bold text-sm sm:text-base">
                      {eventConfig.event_date_display}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div className="text-left">
                    <div className="font-medium text-blue-100 text-xs sm:text-sm">
                      Lokasi
                    </div>
                    <div className="font-bold text-sm sm:text-base">
                      {eventConfig.event_location}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
          {/* Toggle Button - Mobile Optimized */}
          <div className="mb-4 sm:mb-6">
            {/* Desktop View */}
            <div className="hidden sm:flex justify-center">
              <div className="inline-flex bg-white rounded-xl shadow border border-gray-200 p-1">
                <button
                  onClick={() => setMode('register')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-sm">Daftar Baru</span>
                </button>
                <button
                  onClick={() => setMode('login')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-sm">Sudah Daftar</span>
                </button>
              </div>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden space-y-2">
              <button
                onClick={() => setMode('register')}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">Daftar Baru</span>
              </button>
              <button
                onClick={() => setMode('login')}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span className="font-medium">Sudah Daftar</span>
              </button>
            </div>
          </div>

          {/* Mode Login */}
          {mode === 'login' ? (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Masuk dengan NIM
                </h2>
                <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                  Masukkan NIM yang sudah terdaftar
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <label className="block text-sm font-medium text-gray-700">
                        NIM
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="NIM Anda"
                      className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono ${
                        loginErrors.nim ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={loginNim}
                      onChange={(e) => {
                        setLoginNim(e.target.value);
                        const error = validateLoginField('nim', e.target.value);
                        setLoginErrors({ nim: error });
                      }}
                      maxLength={14}
                    />
                    {loginErrors.nim && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {loginErrors.nim}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      14 digit NIM Anda
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!loginNim || loading}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Memverifikasi...
                      </div>
                    ) : (
                      <>
                        Masuk ke Tiket Saya
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    Belum punya tiket?{' '}
                    <button
                      onClick={() => setMode('register')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Daftar baru
                    </button>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Steps */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="flex items-center bg-white rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm border border-gray-200">
                  <div
                    className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mr-1 sm:mr-2 text-xs sm:text-sm ${
                        step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}
                    >
                      {step > 1 ? (
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      ) : (
                        '1'
                      )}
                    </div>
                    <span className="font-medium text-xs sm:text-sm">
                      Identitas
                    </span>
                  </div>

                  <div className="w-6 h-0.5 bg-gray-300 mx-2 sm:mx-3"></div>

                  <div
                    className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mr-1 sm:mr-2 text-xs sm:text-sm ${
                        step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}
                    >
                      2
                    </div>
                    <span className="font-medium text-xs sm:text-sm">
                      Pilih Kelas
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {step === 1 ? (
                      <div className="p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                          Data Diri Peserta
                        </h2>
                        <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                          Isi data diri sesuai KTM/Transkrip
                        </p>

                        <div className="space-y-4">
                          {/* NIM Field */}
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="block text-sm font-medium text-gray-700">
                                NIM
                              </label>
                            </div>
                            <input
                              type="text"
                              name="nim"
                              placeholder="NIM Anda"
                              className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono ${
                                errors.nim
                                  ? 'border-red-500'
                                  : 'border-gray-300'
                              }`}
                              value={formData.nim}
                              onChange={handleChange}
                              maxLength={14}
                            />
                            <div className="flex justify-between mt-1">
                              {formData.angkatan && (
                                <p
                                  className={`text-xs sm:text-sm font-medium ${
                                    validAngkatans.includes(formData.angkatan)
                                      ? 'text-blue-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  Angkatan: {formData.angkatan}
                                </p>
                              )}
                            </div>
                            {errors.nim && (
                              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.nim}
                              </p>
                            )}
                          </div>

                          {/* Nama Field */}
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="block text-sm font-medium text-gray-700">
                                Nama Lengkap
                              </label>
                            </div>
                            <input
                              type="text"
                              name="nama"
                              placeholder="Nama Lengkap Anda"
                              className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                                errors.nama
                                  ? 'border-red-500'
                                  : 'border-gray-300'
                              }`}
                              value={formData.nama}
                              onChange={handleChange}
                            />
                            {errors.nama && (
                              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.nama}
                              </p>
                            )}
                          </div>

                          {/* Email Field */}
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                              <label className="block text-sm font-medium text-gray-700">
                                Email UBP
                              </label>
                            </div>
                            <input
                              type="email"
                              name="email"
                              placeholder="Email UBP Anda"
                              className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                                errors.email
                                  ? 'border-red-500'
                                  : 'border-gray-300'
                              }`}
                              value={formData.email}
                              onChange={handleChange}
                            />
                            {errors.email && (
                              <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.email}
                              </p>
                            )}
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
                            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                          >
                            Lanjutkan ke Pilihan Kelas
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                          <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                              Pilih Kelas Perwakilan
                            </h2>
                            <p className="text-gray-600 text-sm sm:text-base">
                              Maksimal 2 perwakilan per kelas
                            </p>
                          </div>
                          <button
                            onClick={() => setStep(1)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
                          >
                            ← Edit Data
                          </button>
                        </div>

                        {/* Info Angkatan */}
                        {formData.angkatan && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                <div>
                                  <h3 className="font-bold text-blue-800 text-sm sm:text-base">
                                    Angkatan {formData.angkatan}
                                  </h3>
                                  <p className="text-blue-600 text-xs sm:text-sm">
                                    Pilih kelas sesuai angkatan Anda
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-blue-700 font-medium">
                                {availableClassesForAngkatan.length} kelas
                                tersedia
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kelas Selection */}
                        <div className="space-y-4 sm:space-y-6">
                          {formData.angkatan &&
                          validAngkatans.includes(formData.angkatan) ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                                  Kelas Angkatan {formData.angkatan}
                                </h3>
                              </div>

                              {availableClassesForAngkatan.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                                          relative p-2 sm:p-3 rounded-lg border-2 text-center transition-all
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
                                        <div className="font-bold text-sm sm:text-base mb-1">
                                          {cls.nama_kelas}
                                        </div>
                                        <div
                                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                            isFull
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-green-100 text-green-800'
                                          }`}
                                        >
                                          {count}/2
                                        </div>
                                        {isFull && (
                                          <AlertCircle className="absolute top-1 right-1 w-3 h-3 text-red-500" />
                                        )}
                                        {isSelected && (
                                          <Check className="absolute top-1 right-1 w-3 h-3 text-blue-500" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-gray-50 rounded-lg">
                                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-600 text-sm sm:text-base">
                                    Tidak ada kelas tersedia untuk angkatan{' '}
                                    {formData.angkatan}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-red-50 rounded-lg">
                              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mx-auto mb-2" />
                              <p className="text-red-600 text-sm sm:text-base">
                                Angkatan NIM Anda tidak valid. Hanya angkatan
                                2022-2025.
                              </p>
                              <button
                                onClick={() => setStep(1)}
                                className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                ← Kembali ke step 1
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Selected Class Info */}
                        {formData.kelas && (
                          <div className="mt-4 sm:mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                              <div>
                                <h3 className="font-bold text-green-800 text-sm sm:text-base">
                                  Kelas Dipilih: {formData.kelas}
                                </h3>
                                <p className="text-green-600 text-xs sm:text-sm">
                                  Kuota tersisa:{' '}
                                  {2 - (classCounts[formData.kelas] || 0)} dari
                                  2 kursi
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button
                          onClick={handleSubmit}
                          disabled={!formData.kelas || loading}
                          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 text-sm sm:text-base"
                        >
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                <div className="space-y-3 sm:space-y-4">
                  {/* Rules Card */}
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2">
                      Ketentuan
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                          1
                        </div>
                        <span>
                          Maksimal <strong>2 orang</strong> per kelas
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                          2
                        </div>
                        <span>
                          Total: <strong>54 peserta</strong> (27 kelas)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                          3
                        </div>
                        <span>Email harus aktif</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mt-0.5">
                          4
                        </div>
                        <span>Kelas HARUS sesuai angkatan NIM</span>
                      </li>
                    </ul>
                  </div>

                  {/* Contact Card */}
                  {/* Contact Card */}
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2">
                      Bantuan
                    </h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <div className="font-medium text-gray-700">
                          Panitia MUSMA:
                        </div>
                        <div className="text-gray-600">
                          {eventConfig.contact_phone}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Email:</div>
                        <div className="text-gray-600 break-words">
                          {eventConfig.contact_email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Card */}
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-3 sm:p-4">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2">
                      Statistik
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-gray-600">Total Kelas</span>
                          <span className="font-medium">
                            {classes.length} kelas
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div
                            className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(fullClasses / Math.max(classes.length, 1)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          {fullClasses} kelas penuh
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 p-2 rounded-lg text-center">
                          <div className="text-base sm:text-lg font-bold text-green-700">
                            {availableClasses}
                          </div>
                          <div className="text-xs text-green-600">Tersedia</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg text-center">
                          <div className="text-base sm:text-lg font-bold text-red-700">
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

      <Footer />
    </div>
  );
}

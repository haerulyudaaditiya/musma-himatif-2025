import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import {
  UserPlus,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  User,
  Award,
  Hash,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Image,
  Eye,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminCandidatesPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [deletingProcessing, setDeletingProcessing] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedName, setSelectedName] = useState('');

  const openImageModal = (imageUrl, candidateName) => {
    setSelectedImage(imageUrl);
    setSelectedName(candidateName);
    setImageModalOpen(true);
  };

  const [formData, setFormData] = useState({
    no_urut: '',
    nama: '',
    jurusan: 'Teknik Informatika',
    visi_misi: '',
  });

  // Cek session admin
  useEffect(() => {
    const token = localStorage.getItem('musma_admin_token');
    if (token !== 'SECRET_KEY_HIMATIF_2025_SECURE_X99') {
      showToast.error('Akses ditolak. Harap login sebagai admin.');
      localStorage.removeItem('musma_admin_token');
      navigate('/admin/login');
    }
  }, [navigate]);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('no_urut', { ascending: true });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      showToast.error('Gagal memuat data kandidat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const validateForm = () => {
    if (!formData.no_urut.trim()) {
      showToast.error('Nomor urut harus diisi');
      return false;
    }
    if (!formData.nama.trim()) {
      showToast.error('Nama kandidat harus diisi');
      return false;
    }
    if (!formData.visi_misi.trim()) {
      showToast.error('Visi & Misi harus diisi');
      return false;
    }
    return true;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `candidates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('musma-assets')
        .upload(filePath, imageFile);

      if (uploadError) {
        // Fallback ke base64 jika upload gagal
        const base64Image = await fileToBase64(imageFile);
        return base64Image;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('musma-assets').getPublicUrl(filePath);

      return publicUrl;
    } catch {
      const name = formData.nama || 'Candidate';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=0D8ABC&color=fff&size=256`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);

    try {
      let foto_url = null;
      if (imageFile) {
        foto_url = await uploadImage();
      }

      const candidateData = {
        no_urut: parseInt(formData.no_urut),
        nama: formData.nama.trim(),
        jurusan: formData.jurusan.trim(),
        visi_misi: formData.visi_misi.trim(),
        ...(foto_url && { foto_url }),
      };

      if (editingId) {
        // Update existing candidate
        const { error } = await supabase
          .from('candidates')
          .update(candidateData)
          .eq('id', editingId);

        if (error) throw error;
        showToast.success('Kandidat berhasil diperbarui');
      } else {
        // Check duplicate no_urut
        const existing = candidates.find(
          (c) => c.no_urut === parseInt(formData.no_urut)
        );
        if (existing) {
          throw new Error(`Nomor urut ${formData.no_urut} sudah digunakan`);
        }

        // Insert new candidate
        const { error } = await supabase
          .from('candidates')
          .insert([candidateData]);

        if (error) throw error;
        showToast.success('Kandidat berhasil ditambahkan');
      }

      resetForm();
      await fetchCandidates();
    } catch (error) {
      console.error('Error saving candidate:', error);
      showToast.error(error.message || 'Gagal menyimpan kandidat');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (candidate) => {
    setFormData({
      no_urut: candidate.no_urut.toString(),
      nama: candidate.nama,
      jurusan: candidate.jurusan || 'Teknik Informatika',
      visi_misi: candidate.visi_misi || '',
    });
    setImagePreview(candidate.foto_url || '');
    setEditingId(candidate.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setDeletingProcessing(true);

    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;

      showToast.success('Kandidat berhasil dihapus');
      await fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      showToast.error('Gagal menghapus kandidat');
    } finally {
      setDeletingId(null);
      setDeletingProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      no_urut: '',
      nama: '',
      jurusan: 'Teknik Informatika',
      visi_misi: '',
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('File harus berupa gambar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Ukuran file maksimal 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Memuat data kandidat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
          {/* Header */}
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
                  Manajemen Kandidat
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Kelola data calon ketua HIMATIF
                </p>
              </div>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Tambah Kandidat</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              ) : (
                <button
                  onClick={resetForm}
                  className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  Batal
                </button>
              )}
            </div>
          </div>

          {/* Candidate Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  {editingId ? 'Edit Kandidat' : 'Tambah Kandidat Baru'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Isi data lengkap calon ketua HIMATIF
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <label className="block text-sm font-medium text-gray-700">
                          Nomor Urut *
                        </label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={formData.no_urut}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            no_urut: e.target.value,
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        placeholder="1, 2, 3, ..."
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <label className="block text-sm font-medium text-gray-700">
                          Nama Lengkap *
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nama: e.target.value,
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        placeholder="Nama calon"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <label className="block text-sm font-medium text-gray-700">
                          Jurusan
                        </label>
                      </div>
                      <select
                        value={formData.jurusan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            jurusan: e.target.value,
                          }))
                        }
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                      >
                        <option value="Teknik Informatika">
                          Teknik Informatika
                        </option>
                        <option value="Sistem Informasi">
                          Sistem Informasi
                        </option>
                        <option value="Teknologi Informasi">
                          Teknologi Informasi
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column - Photo & Vision/Mission */}
                  <div className="space-y-4">
                    {/* Photo Upload */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Image className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <label className="block text-sm font-medium text-gray-700">
                          Foto Kandidat
                        </label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {imagePreview ? (
                            <button
                              type="button"
                              onClick={() => {
                                const name = formData.nama || 'Preview Gambar';
                                openImageModal(imagePreview, name);
                              }}
                              className="relative group"
                            >
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-300 group-hover:opacity-90 transition"
                              />
                              {/* Overlay dengan icon eye */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block">
                            <div className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition text-center text-sm sm:text-base">
                              <Upload className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                              {imageFile ? imageFile.name : 'Upload Foto'}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Maksimal 5MB. Format: JPG, PNG, JPEG
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Vision & Mission */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visi & Misi *
                      </label>
                      <textarea
                        value={formData.visi_misi}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visi_misi: e.target.value,
                          }))
                        }
                        rows="4"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm sm:text-base"
                        placeholder="Tuliskan visi dan misi kandidat..."
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Gunakan format yang jelas dan mudah dibaca
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow flex items-center justify-center gap-2 text-sm"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingId ? 'Update Kandidat' : 'Simpan Kandidat'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Candidates List */}
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                Daftar Kandidat ({candidates.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Klik edit atau hapus untuk mengelola data
              </p>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Belum Ada Kandidat
                </h3>
                <p className="text-gray-600 mb-4">
                  Tambahkan kandidat untuk memulai pemilihan
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition"
                >
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Tambah Kandidat Pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] sm:min-w-0">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        No.
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Kandidat
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Jurusan
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm">
                              {candidate.no_urut}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {candidate.foto_url ? (
                              <button
                                onClick={() =>
                                  openImageModal(
                                    candidate.foto_url,
                                    candidate.nama
                                  )
                                }
                                className="relative group"
                              >
                                <img
                                  src={candidate.foto_url}
                                  alt={candidate.nama}
                                  className="w-10 h-10 rounded-full object-cover group-hover:opacity-90 transition"
                                />
                                {/* Overlay untuk gambar di tabel */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full flex items-center justify-center transition">
                                  <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {candidate.nama}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {candidate.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {candidate.jurusan || 'Teknik Informatika'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(candidate)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(candidate.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 mb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Hapus</h3>
                  <p className="text-sm text-gray-600">
                    Yakin ingin menghapus kandidat ini?
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6">
                <p className="text-xs text-red-700">
                  <strong>PERHATIAN:</strong> Data yang dihapus tidak dapat
                  dikembalikan. Semua suara untuk kandidat ini juga akan
                  terhapus.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletingProcessing}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - tanpa footer */}
      {imageModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 mb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header dengan tombol close */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Foto Kandidat
                </h3>
                <p className="text-sm text-gray-600">{selectedName}</p>
              </div>
              <button
                onClick={() => setImageModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Image Content saja */}
            <div className="flex-1 p-4">
              <div className="h-full flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt={`Foto ${selectedName}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedName
                    )}&background=0D8ABC&color=fff&size=512`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

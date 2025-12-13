import { useState, useEffect } from 'react';
import { supabase } from '../libs/supabaseClient';
import { showToast } from '../libs/toast';
import { X, Users, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

export default function VoterList({ show, onClose }) {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, checked_in, voted, not_voted

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setLoading(true);
        let query = supabase.from('users').select('*').order('nama');

        // Apply filters
        if (filter === 'checked_in') {
          query = query.eq('status_kehadiran', true);
        } else if (filter === 'not_checked_in') {
          query = query.eq('status_kehadiran', false);
        } else if (filter === 'voted') {
          query = query.eq('sudah_vote', true);
        } else if (filter === 'not_voted') {
          query = query.eq('sudah_vote', false);
        }

        const { data, error } = await query;

        if (error) throw error;
        setVoters(data || []);
      } catch (error) {
        console.error('Error fetching voters:', error);
        showToast.error('Gagal memuat data pemilih');
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      fetchVoters();
    }
  }, [show, filter]);

  const filteredVoters = voters.filter(
    (voter) =>
      voter.nama.toLowerCase().includes(search.toLowerCase()) ||
      voter.nim.includes(search) ||
      voter.kelas.toLowerCase().includes(search.toLowerCase())
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Daftar Peserta
            </h2>
            <p className="text-gray-600">
              {filteredVoters.length} peserta ditemukan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NIM, atau kelas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Peserta</option>
              <option value="checked_in">Sudah Check-in</option>
              <option value="not_checked_in">Belum Check-in</option>
              <option value="voted">Sudah Voting</option>
              <option value="not_voted">Belum Voting</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Memuat data peserta...</p>
              </div>
            </div>
          ) : filteredVoters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600">Tidak ada peserta ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      NIM
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Kelas
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Check-in
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Voting
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVoters.map((voter, index) => (
                    <tr key={voter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {voter.nama}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono">{voter.nim}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {voter.kelas}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {voter.status_kehadiran ? (
                          <div className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Sudah</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>Belum</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {voter.sudah_vote ? (
                          <div className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Sudah</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-gray-600">
                            <span>Belum</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {voter.waktu_checkin
                          ? new Date(voter.waktu_checkin).toLocaleTimeString(
                              'id-ID',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total: {voters.length} peserta • Check-in:{' '}
              {voters.filter((v) => v.status_kehadiran).length} • Voting:{' '}
              {voters.filter((v) => v.sudah_vote).length}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

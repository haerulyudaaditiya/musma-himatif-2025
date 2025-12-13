import { Home, Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">H</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                MUSMA HIMATIF 2025
              </h1>
              <p className="text-xs text-gray-500 -mt-0.5">UBP Karawang</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="btn btn-ghost btn-sm gap-2">
              <Home size={16} />
              <span className="hidden sm:inline">Home</span>
            </a>
            <a href="/admin/login" className="btn btn-outline btn-sm gap-2">
              <Shield size={16} />
              <span className="hidden sm:inline">Admin</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

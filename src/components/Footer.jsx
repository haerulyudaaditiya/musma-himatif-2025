export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-4">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-600">
            © {currentYear} MUSMA HIMATIF UBP Karawang
          </p>
          <p className="text-xs text-gray-400">
            Sistem E-Voting Terpercaya • Hak Cipta Dilindungi
          </p>
        </div>
      </div>
    </footer>
  );
}

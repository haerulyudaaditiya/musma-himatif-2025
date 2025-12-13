import { Toaster } from 'react-hot-toast';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />

      <Header />

      <main className="pb-16">{children}</main>

      <Footer />
    </div>
  );
}

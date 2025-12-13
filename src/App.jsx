import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import TicketPage from './pages/TicketPage';
import AdminLoginPage from './pages/AdminLoginPage';
import ScanPage from './pages/ScanPage';
import VotePage from './pages/VotePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RegisterPage />} />
      <Route path="/ticket" element={<TicketPage />} />
      <Route path="/vote" element={<VotePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/scan" element={<ScanPage />} />
    </Routes>
  );
}

export default App;

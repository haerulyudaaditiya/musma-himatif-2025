import { Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RegisterPage />} />
    </Routes>
  );
}

export default App;

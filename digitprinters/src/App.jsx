import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Bots from './pages/Bots';
import CopyTrading from './pages/CopyTrading';
import AIAnalysis from './pages/AIAnalysis';

function App() {
  return (
    <AuthProvider>
      <TradingProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/bots" element={<Bots />} />
            <Route path="/copy-trading" element={<CopyTrading />} />
            <Route path="/ai-analysis" element={<AIAnalysis />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TradingProvider>
    </AuthProvider>
  );
}

export default App;

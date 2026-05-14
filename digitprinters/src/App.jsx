import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Bots from './pages/Bots';
import CopyTrading from './pages/CopyTrading';
import AIAnalysis from './pages/AIAnalysis';
import Callback from './pages/Callback';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TradingProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/callback" element={<Callback />} />
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
    </ToastProvider>
  );
}

export default App;

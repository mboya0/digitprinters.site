import { useEffect } from 'react';
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
import Settings from './pages/Settings';
import Callback from './pages/Callback';
import ProtectedRoute from './components/common/ProtectedRoute';

const CANONICAL_HOST = 'digitprinters.site';

const logApp = (msg, data) => {
  console.info(`[App] ${msg}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

function App() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentHost = window.location.hostname;
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    logApp('App initialized', {
      hostname: currentHost,
      pathname: currentPath,
      isCanonical: currentHost === CANONICAL_HOST,
    });

    // Redirect www to non-www for production
    if (currentHost === `www.${CANONICAL_HOST}`) {
      const destination = `https://${CANONICAL_HOST}${currentPath}${currentSearch}${currentHash}`;
      logApp('Redirecting from www to canonical host', {
        from: currentHost,
        to: destination,
      });
      window.location.replace(destination);
    }
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <TradingProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              
              {/* OAuth callback routes - support multiple paths for flexibility */}
              <Route path="/auth/callback" element={<Callback />} />
              <Route path="/callback" element={<Callback />} />
              <Route path="/oauth/callback" element={<Callback />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/trading" element={<Trading />} />
                <Route path="/bots" element={<Bots />} />
                <Route path="/copy-trading" element={<CopyTrading />} />
                <Route path="/ai-analysis" element={<AIAnalysis />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              {/* Catch-all redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TradingProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

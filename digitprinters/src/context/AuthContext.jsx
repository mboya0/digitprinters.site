/**
 * Auth Context
 * Manages Deriv websocket lifecycle and platform state
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { initDeriv } from '../services/deriv';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ email: 'trader@digitprinters.io' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deriv, setDeriv] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [websiteStatus, setWebsiteStatus] = useState(null);

  useEffect(() => {
    const derivInstance = initDeriv();
    setDeriv(derivInstance);

    const updateStatus = (nextStatus) => setStatus(nextStatus);
    const handleError = (err) => setError(err?.message || String(err));

    const unsubStatus = derivInstance.on('status', updateStatus);
    const unsubError = derivInstance.on('error', handleError);
    const unsubConnected = derivInstance.on('connected', () => {
      setIsAuthenticated(true);
      setError(null);
    });

    const connect = async () => {
      try {
        await derivInstance.connect();
        const statusResponse = await derivInstance.getWebsiteStatus();
        setWebsiteStatus(statusResponse.website_status || null);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    connect();

    return () => {
      unsubStatus();
      unsubError();
      unsubConnected();
      derivInstance.disconnect();
    };
  }, []);

  const connectDeriv = async () => {
    if (!deriv) return;
    setLoading(true);
    try {
      await deriv.connect();
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'Deriv connection failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (deriv) {
      deriv.disconnect();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        deriv,
        status,
        error,
        websiteStatus,
        connectDeriv,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

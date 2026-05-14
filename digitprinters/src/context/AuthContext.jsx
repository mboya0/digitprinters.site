/**
 * Auth Context
 * Manages authentication state and Deriv connection
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { initDeriv, getDeriv } from '../services/deriv';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deriv, setDeriv] = useState(null);
  const [error, setError] = useState(null);

  // Initialize Deriv connection on mount
  useEffect(() => {
    const initDerivConnection = async () => {
      try {
        const appId = import.meta.env.VITE_DERIV_APP_ID || '1234'; // Replace with your app ID
        const derivInstance = initDeriv(appId);
        setDeriv(derivInstance);

        // Attempt connection
        await derivInstance.connect();
        console.log('✅ Deriv connection established');

        // Get initial website status
        const status = await derivInstance.getWebsiteStatus();
        console.log('Website status:', status);
      } catch (err) {
        console.error('Failed to initialize Deriv:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initDerivConnection();

    return () => {
      if (deriv) {
        deriv.disconnect();
      }
    };
  }, []);

  const connectDeriv = async (authCode) => {
    try {
      setLoading(true);
      // This is where you would handle OAuth flow with Deriv
      // For now, we'll just set authenticated state
      const userData = {
        email: 'user@example.com',
        id: 'user_123',
        account: authCode,
      };
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
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
        error,
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

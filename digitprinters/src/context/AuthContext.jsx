/**
 * Auth Context
 * Manages Deriv websocket lifecycle and platform state
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDeriv } from '../services/deriv';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deriv, setDeriv] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [websiteStatus, setWebsiteStatus] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('deriv_access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('deriv_refresh_token'));

  useEffect(() => {
    const derivInstance = initDeriv();
    setDeriv(derivInstance);

    const updateStatus = (nextStatus) => setStatus(nextStatus);
    const handleError = (err) => setError(err?.message || String(err));
    const handleAuthorized = (data) => {
      setIsAuthenticated(true);
      setError(null);
      if (data.authorize) {
        setUser({
          accountId: data.authorize.account?.account_number,
          balance: data.authorize.account?.balance,
          currency: data.authorize.account?.currency,
          email: data.authorize.account?.email,
        });
      }
    };

    const unsubStatus = derivInstance.on('status', updateStatus);
    const unsubError = derivInstance.on('error', handleError);
    const unsubAuthorized = derivInstance.on('authorized', handleAuthorized);

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

    if (accessToken) {
      derivInstance.setToken(accessToken);
      connect();
    } else {
      setLoading(false);
    }

    return () => {
      unsubStatus();
      unsubError();
      unsubAuthorized();
      derivInstance.disconnect();
    };
  }, [accessToken]);

  const login = useCallback(() => {
    const appId = '332LK4VWd9A4pEEfTMn53';
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=read`;
    window.location.href = oauthUrl;
  }, []);

  const handleCallback = useCallback(async (code) => {
    setLoading(true);
    try {
      const appId = '332LK4VWd9A4pEEfTMn53';
      const clientSecret = '3JNlgipzptboEHB';
      const redirectUri = window.location.origin + '/callback';

      const response = await fetch('https://oauth.deriv.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: appId,
          client_secret: clientSecret,
          redirect_uri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      localStorage.setItem('deriv_access_token', access_token);
      localStorage.setItem('deriv_refresh_token', refresh_token);

      // Set token on deriv instance
      if (deriv) {
        deriv.setToken(access_token);
      }

      // Now connect with the token
      if (deriv) {
        await deriv.connect();
      }
    } catch (err) {
      setError(err.message || 'OAuth callback failed');
    } finally {
      setLoading(false);
    }
  }, [deriv]);

  const connectDeriv = useCallback(async () => {
    if (!deriv) return;
    setLoading(true);
    try {
      await deriv.connect();
    } catch (err) {
      setError(err.message || 'Deriv connection failed');
    } finally {
      setLoading(false);
    }
  }, [deriv]);

  const authorize = useCallback(async () => {
    if (!deriv) {
      throw new Error('Deriv is not available');
    }
    if (!accessToken) {
      throw new Error('No access token available');
    }
    setLoading(true);
    try {
      const response = await deriv.authorize(accessToken);
      if (response.authorize) {
        setIsAuthenticated(true);
      }
      return response;
    } catch (err) {
      setError(err.message || 'Authorization failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [deriv, accessToken]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('deriv_access_token');
    localStorage.removeItem('deriv_refresh_token');
    if (deriv) {
      deriv.disconnect();
    }
  }, [deriv]);

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
        accessToken,
        login,
        handleCallback,
        connectDeriv,
        authorize,
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

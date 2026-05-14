/**
 * Auth Context
 * Manages Deriv websocket lifecycle and platform state
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDeriv } from '../services/deriv';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
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

    const updateStatus = (nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'connected') {
        addToast('Connected to Deriv and streaming live data', 'success');
      } else if (nextStatus === 'disconnected') {
        addToast('Connection lost. Reconnecting automatically...', 'warning');
      } else if (nextStatus === 'error') {
        addToast('Deriv websocket reported an error', 'error');
      }
    };

    const handleError = (err) => {
      const message = err?.message || String(err);
      setError(message);
      addToast(`Deriv error: ${message}`, 'error');
    };

    const handleAuthorized = async (data) => {
      setIsAuthenticated(true);
      setError(null);
      if (data.authorize) {
        const account = data.authorize.account || {};
        setUser({
          accountId: account.account_number || account.loginid || 'Unknown',
          balance: account.balance || 0,
          currency: account.currency || 'USD',
          email: account.email || '',
        });

        try {
          const accountListResponse = await derivInstance.getAccountList();
          const fetchedAccounts = Array.isArray(accountListResponse.account_list)
            ? accountListResponse.account_list
            : [];
          setAccounts(fetchedAccounts);
          const authorizedAccount = fetchedAccounts.find(
            (acc) => acc.account_number === account.account_number || acc.loginid === account.loginid
          );
          setSelectedAccount(authorizedAccount || fetchedAccounts[0] || null);
        } catch (err) {
          console.error('Error fetching accounts:', err);
        }
      }
    };

    const fetchAccounts = async () => {
      if (!derivInstance || !derivInstance.isConnected()) return;
      try {
        const response = await derivInstance.getAccountList();
        const refreshedAccounts = Array.isArray(response.account_list)
          ? response.account_list
          : [];
        setAccounts(refreshedAccounts);
      } catch (err) {
        console.error('Error refreshing accounts:', err);
      }
    };

    const connect = async () => {
      try {
        await derivInstance.connect();
        const statusResponse = await derivInstance.getWebsiteStatus();
        setWebsiteStatus(statusResponse.website_status || null);
        await fetchAccounts();
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    const unsubStatus = derivInstance.on('status', updateStatus);
    const unsubError = derivInstance.on('error', handleError);
    const unsubAuthorized = derivInstance.on('authorized', handleAuthorized);

    let refreshInterval = null;
    if (accessToken) {
      derivInstance.setToken(accessToken);
      connect();
      refreshInterval = setInterval(fetchAccounts, 45000);
    } else {
      setLoading(false);
    }

    return () => {
      unsubStatus();
      unsubError();
      unsubAuthorized();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      derivInstance.disconnect();
    };
  }, [accessToken, addToast]);

  const login = useCallback(() => {
    const appId = '332LK4VWd9A4pEEfTMn53';
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=read`;
    window.location.href = oauthUrl;
  }, []);

  const handleCallback = useCallback(
    async (code) => {
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
            redirect_uri: redirectUri,
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

        if (deriv) {
          deriv.setToken(access_token);
          await deriv.connect();
        }
      } catch (err) {
        setError(err.message || 'OAuth callback failed');
      } finally {
        setLoading(false);
      }
    },
    [deriv]
  );

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
    setAccounts([]);
    setSelectedAccount(null);
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
        accounts,
        selectedAccount,
        setSelectedAccount,
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

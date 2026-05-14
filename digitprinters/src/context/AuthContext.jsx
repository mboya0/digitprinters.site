/**
 * Auth Context
 * Manages Deriv websocket lifecycle and platform state
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDeriv } from '../services/deriv';
import { useToast } from './ToastContext';
import { DERIV_OAUTH_CONFIG } from '../utils/constants';

const AuthContext = createContext(null);

const getStoredState = () => localStorage.getItem('deriv_oauth_state');
const getPostLoginRedirect = () => localStorage.getItem('deriv_post_login_redirect') || '/dashboard';
const clearStoredAuthState = () => {
  localStorage.removeItem('deriv_oauth_state');
  localStorage.removeItem('deriv_post_login_redirect');
};

const generateRandomState = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const storeAuthState = (state, redirectPath) => {
  localStorage.setItem('deriv_oauth_state', state);
  localStorage.setItem('deriv_post_login_redirect', redirectPath || '/dashboard');
};

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
  const [tokenExpiry, setTokenExpiry] = useState(
    Number(localStorage.getItem('deriv_token_expiry')) || null
  );
  const [loginStatus, setLoginStatus] = useState(accessToken ? 'pending' : 'unauthenticated');

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setAccounts([]);
    setSelectedAccount(null);
    setAccessToken(null);
    setRefreshToken(null);
    setTokenExpiry(null);
    setLoginStatus('unauthenticated');
    setStatus('disconnected');
    setWebsiteStatus(null);
    setError(null);
    localStorage.removeItem('deriv_access_token');
    localStorage.removeItem('deriv_refresh_token');
    localStorage.removeItem('deriv_token_expiry');
    clearStoredAuthState();
    if (deriv) {
      deriv.disconnect();
    }
  }, [deriv]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          redirect_uri: window.location.origin,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.access_token) {
        throw new Error(data.error || 'Failed to refresh Deriv session');
      }

      const expiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
      localStorage.setItem('deriv_access_token', data.access_token);
      localStorage.setItem('deriv_refresh_token', data.refresh_token || refreshToken);
      if (expiry) localStorage.setItem('deriv_token_expiry', String(expiry));

      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token || refreshToken);
      setTokenExpiry(expiry);
      setLoginStatus('authenticated');
      setError(null);

      if (deriv) {
        deriv.setToken(data.access_token);
        await deriv.connect();
      }

      return data;
    } catch (err) {
      logout();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [deriv, logout, refreshToken]);

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
      setLoginStatus('authenticated');
      setIsAuthenticated(true);
      setError(null);

      const account = data.authorize?.account || {};
      setUser({
        accountId: account.account_number || account.loginid || 'Unknown',
        balance: Number(account.balance || 0),
        currency: account.currency || 'USD',
        email: account.email || '',
        accountType:
          account.is_virtual || account.account_type === 'virtual' ? 'Demo' : 'Real',
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

    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (!tokenExpiry || !refreshToken) return;
      const msUntilRefresh = tokenExpiry - Date.now() - 120000;
      if (msUntilRefresh <= 0) {
        refreshAccessToken().catch(() => {});
        return;
      }
      refreshTimer = window.setTimeout(() => {
        refreshAccessToken().catch(() => {});
      }, msUntilRefresh);
    };

    if (accessToken) {
      derivInstance.setToken(accessToken);
      if (tokenExpiry && Date.now() > tokenExpiry && refreshToken) {
        refreshAccessToken().catch(() => {});
      } else {
        connect();
      }
      scheduleRefresh();
    } else {
      setLoading(false);
    }

    return () => {
      unsubStatus();
      unsubError();
      unsubAuthorized();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      derivInstance.disconnect();
    };
  }, [accessToken, addToast, refreshAccessToken, refreshToken, tokenExpiry]);

  const login = useCallback(() => {
    const state = generateRandomState();
    const redirectPath = window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
    storeAuthState(state, redirectPath);
    const redirectUri = window.location.origin;
    const oauthUrl = `${DERIV_OAUTH_CONFIG.authorize_url}?response_type=code&client_id=${DERIV_OAUTH_CONFIG.client_id}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(DERIV_OAUTH_CONFIG.scope)}&state=${state}`;
    window.location.href = oauthUrl;
  }, []);

  const handleCallback = useCallback(
    async (code, state) => {
      setLoading(true);
      setError(null);
      const storedState = getStoredState();

      if (!code) {
        throw new Error('Missing authorization code');
      }

      if (!storedState || storedState !== state) {
        clearStoredAuthState();
        throw new Error('Invalid OAuth state. Please try logging in again.');
      }

      try {
        const response = await fetch('/api/oauth-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: window.location.origin,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.access_token) {
          throw new Error(data.error || 'Failed to exchange code for token');
        }

        const expiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
        localStorage.setItem('deriv_access_token', data.access_token);
        localStorage.setItem('deriv_refresh_token', data.refresh_token || '');
        if (expiry) {
          localStorage.setItem('deriv_token_expiry', String(expiry));
        }

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token || '');
        setTokenExpiry(expiry);
        setLoginStatus('authenticated');
        clearStoredAuthState();

        if (deriv) {
          deriv.setToken(data.access_token);
          await deriv.connect();
        }

        return getPostLoginRedirect();
      } catch (err) {
        setError(err.message || 'OAuth callback failed');
        setLoginStatus('unauthenticated');
        throw err;
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
        loginStatus,
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

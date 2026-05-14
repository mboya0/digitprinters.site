/**
 * Auth Context
 * Manages Deriv OAuth 2.0 flow and websocket lifecycle
 * 
 * Flow:
 * 1. User clicks "Login with Deriv"
 * 2. App generates OAuth state and redirects to https://oauth.deriv.com/oauth2/authorize
 * 3. User sees Deriv authorization screen with requested scopes
 * 4. User authorizes and is redirected back to /auth/callback with code
 * 5. Backend exchanges code for access token
 * 6. App stores token and connects websocket
 * 7. App authorizes websocket connection with token
 * 8. User sees dashboard with live trading data
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initDeriv } from '../services/deriv';
import { useToast } from './ToastContext';
import { DERIV_OAUTH_CONFIG, OAUTH_LOGGING } from '../utils/constants';

const AuthContext = createContext(null);

// ==================== OAuth State Management ====================

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

// ==================== Logging Utilities ====================

const logOAuth = (action, data) => {
  if (OAUTH_LOGGING.enabled) {
    console.info(`[OAuth] ${action}`, data);
  }
};

const logOAuthError = (action, error) => {
  console.error(`[OAuth Error] ${action}`, error);
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
    logOAuth('User logout initiated', { timestamp: new Date().toISOString() });

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

    logOAuth('Logout completed', {
      timestamp: new Date().toISOString(),
      tokensCleared: true,
      websocketDisconnected: !!deriv,
    });
  }, [deriv]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      logOAuth('Token refresh skipped - no refresh token', {});
      return null;
    }

    setLoading(true);
    logOAuth('Refreshing access token', { timestamp: new Date().toISOString() });

    try {
      const response = await fetch('/api/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          redirect_uri: DERIV_OAUTH_CONFIG.redirect_uri,
        }),
      });

      const data = await response.json();

      logOAuth('Token refresh response received', {
        status: response.status,
        hasAccessToken: !!data.access_token,
        expiresIn: data.expires_in,
      });

      if (!response.ok || !data.access_token) {
        throw new Error(data.error || 'Failed to refresh Deriv session');
      }

      const expiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
      localStorage.setItem('deriv_access_token', data.access_token);
      localStorage.setItem('deriv_refresh_token', data.refresh_token || refreshToken);
      if (expiry) localStorage.setItem('deriv_token_expiry', String(expiry));

      logOAuth('Tokens refreshed successfully', {
        accessTokenLength: data.access_token.length,
        expiresIn: data.expires_in,
      });

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
      const errorMsg = err?.message || 'Token refresh failed';
      logOAuthError('Token refresh failed', { error: errorMsg });
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
        logOAuth('Connecting to Deriv websocket', { timestamp: new Date().toISOString() });
        await derivInstance.connect();
        const statusResponse = await derivInstance.getWebsiteStatus();
        setWebsiteStatus(statusResponse.website_status || null);
        logOAuth('Websocket connected and website status retrieved', {
          timestamp: new Date().toISOString(),
        });
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

    const oauthParams = new URLSearchParams({
      response_type: DERIV_OAUTH_CONFIG.response_type,
      client_id: DERIV_OAUTH_CONFIG.client_id,
      redirect_uri: DERIV_OAUTH_CONFIG.redirect_uri,
      scope: DERIV_OAUTH_CONFIG.scope,
      state,
    });

    const oauthUrl = `${DERIV_OAUTH_CONFIG.authorize_url}?${oauthParams.toString()}`;

    logOAuth('Initiating OAuth login flow', {
      endpoint: DERIV_OAUTH_CONFIG.authorize_url,
      client_id: DERIV_OAUTH_CONFIG.client_id,
      redirect_uri: DERIV_OAUTH_CONFIG.redirect_uri,
      scope: DERIV_OAUTH_CONFIG.scope,
      state: state.substring(0, 8) + '...', // Don't log full state
      postLoginRedirect: redirectPath,
      timestamp: new Date().toISOString(),
    });

    logOAuth('Generated OAuth URL', {
      url: oauthUrl,
      length: oauthUrl.length,
    });

    window.location.href = oauthUrl;
  }, []);

  const handleCallback = useCallback(
    async (code, state) => {
      setLoading(true);
      setError(null);
      const storedState = getStoredState();

      logOAuth('OAuth callback received', {
        path: window.location.pathname,
        hasCode: !!code,
        hasState: !!state,
        stateMatches: state === storedState,
        timestamp: new Date().toISOString(),
      });

      if (!storedState || storedState !== state) {
        const errorMsg = 'Invalid OAuth state. Please try logging in again.';
        logOAuthError('State validation failed', {
          storedState: storedState?.substring(0, 8) + '...',
          receivedState: state?.substring(0, 8) + '...',
          match: state === storedState,
        });
        clearStoredAuthState();
        throw new Error(errorMsg);
      }

      if (!code) {
        const errorMsg = 'No authorization code received from Deriv';
        logOAuthError('Missing authorization code', { code });
        clearStoredAuthState();
        throw new Error(errorMsg);
      }

      try {
        logOAuth('Exchanging authorization code for tokens', {
          codeLength: code.length,
          redirectUri: DERIV_OAUTH_CONFIG.redirect_uri,
          endpoint: '/api/oauth-token',
        });

        const response = await fetch('/api/oauth-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: DERIV_OAUTH_CONFIG.redirect_uri,
          }),
        });

        const data = await response.json();

        logOAuth('Token exchange response received', {
          status: response.status,
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          expiresIn: data.expires_in,
          timestamp: new Date().toISOString(),
        });

        if (!response.ok || !data.access_token) {
          throw new Error(data.error || 'Failed to exchange code for token');
        }

        const expiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
        localStorage.setItem('deriv_access_token', data.access_token);
        localStorage.setItem('deriv_refresh_token', data.refresh_token || '');
        if (expiry) {
          localStorage.setItem('deriv_token_expiry', String(expiry));
        }

        logOAuth('Tokens stored successfully', {
          accessTokenLength: data.access_token.length,
          expiresIn: data.expires_in,
          expiryTime: new Date(expiry).toISOString(),
        });

        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token || '');
        setTokenExpiry(expiry);
        setLoginStatus('authenticated');
        clearStoredAuthState();

        logOAuth('Initializing websocket connection with OAuth token', {
          timestamp: new Date().toISOString(),
        });

        if (deriv) {
          deriv.setToken(data.access_token);
          await deriv.connect();

          logOAuth('Websocket connected successfully', {
            timestamp: new Date().toISOString(),
          });
        }

        const redirectPath = getPostLoginRedirect();
        logOAuth('OAuth callback completed', {
          redirectPath,
          timestamp: new Date().toISOString(),
        });

        return redirectPath;
      } catch (err) {
        const errorMsg = err.message || 'OAuth callback failed';
        logOAuthError('Callback processing failed', {
          error: errorMsg,
          stack: err.stack,
        });
        setError(errorMsg);
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

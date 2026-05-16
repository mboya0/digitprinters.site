import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const logCallback = (msg, data) => {
  console.info(`[Callback] ${msg}`, {
    ...data,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
};

const logCallbackError = (msg, error) => {
  console.error(`[Callback Error] ${msg}`, {
    error: error?.message || String(error),
    stack: error?.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
};

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback, initializationStep } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const callbackParams = Object.fromEntries(searchParams.entries());

    logCallback('OAuth callback page loaded', {
      hasCode: !!code,
      codeLength: code?.length || 0,
      hasState: !!state,
      hasError: !!errorParam,
      errorParam,
      params: callbackParams,
      paramKeys: Object.keys(callbackParams),
      path: window.location.pathname,
      search: window.location.search,
    });
    console.info('[Callback] Deriv OAuth callback params', {
      code,
      state,
      error: errorParam,
      error_description: errorDescription,
      params: callbackParams,
      url: window.location.href,
    });

    // Check for OAuth error from Deriv
    if (errorParam) {
      const errorMsg = errorDescription || errorParam;
      logCallbackError('OAuth error from Deriv', {
        error: errorParam,
        description: errorDescription,
      });
      addToast(`OAuth error: ${errorMsg}`, 'error');
      navigate('/', { replace: true });
      return;
    }

    // Validate that we have an authorization code
    if (!code) {
      logCallbackError('Missing authorization code in callback', {
        code,
        state,
      });
      addToast('Invalid callback: missing authorization code', 'error');
      navigate('/', { replace: true });
      return;
    }

    // Process the callback
    handleCallback(code, state)
      .then((redirectPath) => {
        logCallback('OAuth callback processed successfully', {
          redirectPath,
          codeLength: code.length,
        });
        navigate(redirectPath || '/dashboard', { replace: true });
      })
      .catch((err) => {
        logCallbackError('Callback processing failed', err);
        const errorMsg = err?.message || 'Deriv login failed';
        addToast(errorMsg, 'error');
        navigate('/', { replace: true });
      });
  }, [searchParams, handleCallback, navigate, addToast]);

  return <LoadingSpinner fullScreen message={initializationStep || 'Authenticating...'} />;
}
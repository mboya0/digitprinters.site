import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code) {
      handleCallback(code, state)
        .then((redirectPath) => {
          navigate(redirectPath || '/dashboard', { replace: true });
        })
        .catch((err) => {
          console.error('Callback error:', err);
          addToast(err?.message || 'Deriv login failed', 'error');
          navigate('/', { replace: true });
        });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, handleCallback, navigate, addToast]);

  return <LoadingSpinner fullScreen />;
}
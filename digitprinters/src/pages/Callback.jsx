import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleCallback(code).then(() => {
        navigate('/dashboard');
      }).catch((err) => {
        console.error('Callback error:', err);
        navigate('/');
      });
    } else {
      navigate('/');
    }
  }, [searchParams, handleCallback, navigate]);

  return <LoadingSpinner fullScreen />;
}
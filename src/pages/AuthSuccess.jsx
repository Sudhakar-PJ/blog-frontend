import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const exchangeCode = async () => {
      const code = searchParams.get('code');
      if (!code) {
        navigate('/login');
        return;
      }

      try {
        console.log('Exchanging Google code:', code);
        const response = await api.post('/auth/google/exchange', { code });
        console.log('Exchange successful! User:', response.data.user);
        setUser(response.data.user);
        navigate('/feed');
      } catch (err) {
        console.error('Google Auth Exchange failed:', err.response?.data || err.message);
        navigate('/login?error=social_auth_failed');
      }
    };

    exchangeCode();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Completing login...</h2>
        <p className="text-gray-500 text-sm">Please wait while we secure your connection.</p>
      </div>
    </div>
  );
};

export default AuthSuccess;

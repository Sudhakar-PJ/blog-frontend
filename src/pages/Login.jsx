import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaUserId, setTwoFaUserId] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.status === 202 && response.data.requires2FA) {
        setRequires2FA(true);
        setTwoFaUserId(response.data.userId);
        return;
      }
      
      window.location.href = '/feed';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/login/2fa', { userId: twoFaUserId, code: twoFaCode });
      window.location.href = '/feed';
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setStatusMessage(response.data.message || 'New password sent to your email');
      setForgotEmail('');
      setTimeout(() => setShowForgotModal(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your details to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center justify-center gap-2 font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg flex items-center justify-center gap-2 font-medium">
              <AlertCircle size={18} className="rotate-180" />
              {statusMessage}
            </div>
          )}

          {requires2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-700 font-semibold mb-2">We sent a verification code to your phone.</p>
                <input 
                  type="text" 
                  maxLength="6"
                  className="mt-1 block w-full px-4 py-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-center text-2xl tracking-[0.5em] font-mono" 
                  placeholder="000000" 
                  value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                disabled={loading || twoFaCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button 
                type="button" 
                onClick={() => setRequires2FA(false)} 
                className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 mt-2"
              >
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="block w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">OR</span>
                  </div>
                </div>

                <div className="mt-6">
                  <a
                    href="http://localhost:5000/api/v1/auth/google"
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </a>
                </div>
              </div>
            </form>
          )}
          
          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Forgot Password?</h3>
            <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a new generated password.</p>
            
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setError(''); setStatusMessage(''); }}
                  className="text-gray-400 font-bold text-sm hover:text-gray-600 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

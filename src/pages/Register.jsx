import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Register = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, username, password);
      window.location.href = '/feed';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">Create account</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join our advanced platform today
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Email Address</label>
              <div className="relative mt-1">
                <Mail size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
                <input
                  type="email"
                  className="block w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Username</label>
              <div className="relative mt-1">
                <Mail size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
                <input
                  type="text"
                  className="block w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                  placeholder="cooluser99"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative mt-1">
                <Lock size={18} className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
                <input
                  type="password"
                  className="block w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400 uppercase tracking-widest text-[10px] font-bold">Or continue with</span>
              <div className="absolute inset-0 flex items-center -z-10">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="http://localhost:5000/api/v1/auth/google"
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </a>
            </div>
          </div>
          
          <p className="mt-8 text-center text-sm text-gray-600">
             Already have an account?{' '}
             <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
               Sign In
             </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

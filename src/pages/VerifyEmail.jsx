import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

const VerifyEmail = () => {
  const { user, verifyEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmailCode(user.id, code);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/feed';
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-4 bg-indigo-100 rounded-2xl border border-indigo-200">
            <Mail size={32} className="text-indigo-600" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Check Your Email</h2>
        <p className="text-center text-sm text-gray-600 mb-8 px-4">
          We sent a 6-digit verification code to <span className="font-bold text-gray-800">{user?.email}</span>. Please enter it below to access your feed.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2 font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-6 rounded-xl flex flex-col items-center gap-3">
              <CheckCircle size={40} className="text-green-500" />
              <span className="font-bold text-lg">Verified! Taking you to the feed...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input 
                  type="text" 
                  maxLength="6"
                  className="block w-full px-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-center text-3xl tracking-[0.5em] font-mono text-gray-900 placeholder:text-gray-300" 
                  placeholder="000000" 
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50" 
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Now'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ShieldAlert, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const VerifyPhone = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/users/profile/phone-verify/confirm', { code });
      setSuccess(true);
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-4 shadow-xl rounded-3xl sm:px-10 border border-gray-100 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-bounce border-4 border-green-50">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Phone Verified!</h2>
            <p className="text-gray-500 font-medium">Your device is now securely linked to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center mb-2 border-2 border-indigo-50 shadow-md">
            <ShieldAlert size={32} className="text-indigo-600" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Verify Your Device</h2>
        <p className="text-center text-sm text-gray-600 mb-8 px-4 font-medium">
          We sent a secure 6-digit code via SMS to your bound phone number.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-3xl sm:px-10 border border-gray-100 relative overflow-hidden">
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2 font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input 
                type="text" 
                maxLength="6"
                className="block w-full px-4 py-4 border border-gray-300 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-center text-4xl tracking-[0.5em] font-mono text-gray-900 bg-gray-50 focus:bg-white placeholder:text-gray-300" 
                placeholder="000000" 
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-md text-base font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 group" 
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying Component...' : 'Confirm Identity'}
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium">
              Didn't receive it? Check your network connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;

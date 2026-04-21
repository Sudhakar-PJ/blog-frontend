import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { SocketProvider } from './contexts/SocketProvider';
import { useAuth } from './contexts/AuthContext';

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Feed = React.lazy(() => import('./pages/Feed'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const VerifyPhone = React.lazy(() => import('./pages/VerifyPhone'));

const PageFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Navigate to="/login" />;
  if (!user.is_email_verified) return <Navigate to="/verify" />;
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (user) {
    if (!user.is_email_verified) return <Navigate to="/verify" />;
    return <Navigate to="/feed" />;
  }
  
  return children;
};

const UnverifiedRequiredRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.is_email_verified) return <Navigate to="/feed" />;

  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/verify" element={
            <UnverifiedRequiredRoute>
              <VerifyEmail />
            </UnverifiedRequiredRoute>
          } />
          <Route path="/feed" element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/profile/:id" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } />
          <Route path="/verify-phone" element={
            <ProtectedRoute>
              <VerifyPhone />
            </ProtectedRoute>
          } />
          {/* Default redirect to feed, which redirects to login if unauth */}
          <Route path="/" element={<Navigate to="/feed" />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;

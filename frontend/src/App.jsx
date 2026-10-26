import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import { Dashboard, History, Learning, Settings, Wallet } from './pages/Dashboard';
import Resume from './pages/Resume';
import Interview from './pages/Interview';
import Practice from './pages/Practice';
import Results from './pages/Results';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading HireAI</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
      <Route path="/interview/new" element={<Navigate to="/practice" replace />} />
      <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
      <Route path="/learning" element={<ProtectedRoute><Learning /></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
      <Route path="/credits" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

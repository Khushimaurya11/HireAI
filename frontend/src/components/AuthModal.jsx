import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({ onClose }) {
  const navigate = useNavigate();
  const { register, signIn, signInWithGoogle, firebaseReady } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'register') await register(name, email, password);
      else await signIn(email, password);
      onClose();
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Authentication failed');
    }
  };

  const google = async () => {
    try {
      setError('');
      await signInWithGoogle();
      onClose();
      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="close" onClick={onClose} aria-label="Close sign in">-</button>
        <span className="eyebrow">WELCOME BACK</span>
        <h2>{mode === 'login' ? 'Ready when you are.' : 'Create your account.'}</h2>
        <p className="muted">{mode === 'login' ? 'Sign in to continue your interview preparation.' : 'Create a secure HireAI account to save your progress.'}</p>
        {firebaseReady && <button className="button ghost wide" onClick={google}>Continue with Google</button>}
        <form onSubmit={submit}>
          {mode === 'register' && <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input required minLength="8" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button className="button primary wide" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="button ghost wide" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Create a new account' : 'Sign in to an existing account'}
        </button>
      </div>
    </div>
  );
}

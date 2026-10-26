import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { authApi } from '../services/api';

const AuthContext = createContext(null);
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const firebaseReady = Object.values(firebaseConfig).every(Boolean);
const firebaseAuth = firebaseReady ? getAuth(initializeApp(firebaseConfig)) : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((response) => setUser(response.data.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const register = async (name, email, password) => {
    const response = await authApi.register({ name, email, password });
    setUser(response.data.user);
    return response.data.user;
  };

  const signIn = async (email, password) => {
    const response = await authApi.login({ email, password });
    setUser(response.data.user);
    return response.data.user;
  };

  const signInWithGoogle = async () => {
    if (!firebaseAuth) throw new Error('Configure Firebase VITE variables first');
    const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    const response = await authApi.google(await result.user.getIdToken());
    setUser(response.data.user);
    return response.data.user;
  };

  const signOut = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, signIn, signInWithGoogle, firebaseReady, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

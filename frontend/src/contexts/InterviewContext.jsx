import React, { createContext, useContext, useEffect, useState } from 'react';
import { interviewApi } from '../services/api';
import { useAuth } from './AuthContext';

const InterviewContext = createContext(null);
const PROFILE_KEY = 'hireai_resume_profile';

export function InterviewProvider({ children }) {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [active, setActive] = useState(null);
  const [resumeProfile, setResumeProfileState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
  });
  const [resumeFilename, setResumeFilename] = useState(() => localStorage.getItem(`${PROFILE_KEY}_filename`) || '');
  const setResumeProfile = (profile, filename = '') => {
    setResumeProfileState(profile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (filename) {
      setResumeFilename(filename);
      localStorage.setItem(`${PROFILE_KEY}_filename`, filename);
    }
  };
  const refresh = () => {
    if (!user) {
      setInterviews([]);
      return Promise.resolve([]);
    }
    return interviewApi.list().then((response) => {
      const next = response.data.interviews || [];
      setInterviews(next);
      return next;
    }).catch(() => []);
  };
  useEffect(() => { refresh(); }, [user]);
  return <InterviewContext.Provider value={{ interviews, active, setActive, refresh, resumeProfile, resumeFilename, setResumeProfile }}>{children}</InterviewContext.Provider>;
}

export const useInterviews = () => useContext(InterviewContext);

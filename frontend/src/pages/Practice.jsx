import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { practiceTypes } from '../data/practice';
import { useInterviews } from '../contexts/InterviewContext';
import { interviewApi } from '../services/api';
import AIInterviewer from '../components/AIInterviewer';
import InterviewTypeSelector from '../components/InterviewTypeSelector';

export default function Practice() {
  const nav = useNavigate();
  const { resumeProfile, resumeFilename, setActive } = useInterviews();
  const [mode, setMode] = useState('Technical');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const start = async () => {
    if (!resumeProfile) {
      setMessage('Upload and parse a resume on the dashboard first.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await interviewApi.start({ mode });
      setActive(response.data.interview);
      nav('/interview?session=active');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Your interview could not be started.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="topbar">PRACTICE LAB</div>
      <section className="page-head">
        <div>
          <span className="eyebrow">PERSONALIZED SIMULATION</span>
          <h1>Start a targeted round from your profile.</h1>
          <p className="muted">{resumeProfile ? `Using ${resumeFilename || 'your parsed resume'} to shape the interview.` : 'Upload your resume first so each question reflects your experience.'}</p>
        </div>
      </section>
      <div className="practice-shell">
        <section className="panel practice-generator">
          <div className="section-heading">
            <div><span className="eyebrow">ROUND SELECTOR</span><h2>{resumeProfile ? 'Choose your interview round' : 'Your resume comes first'}</h2></div>
            <Link className="text-link" to="/dashboard">Manage resume →</Link>
          </div>
          <InterviewTypeSelector value={mode} onChange={setMode} />
          <button className="button primary" disabled={busy || !resumeProfile} onClick={start} type="button">
            {busy ? 'Preparing your interview…' : 'Start Interview'}
          </button>
          {message && <p className="demo-notice" role="alert">{message}</p>}
        </section>
        <AIInterviewer compact state={busy ? 'analyzing' : 'standby'} subtitle={busy ? 'Preparing your private interview session' : 'Select a round and start when you are ready'} />
      </div>
      <div className="practice-grid">
        {practiceTypes.map((type, index) => (
          <article className="practice-card" key={type.id}>
            <span className="practice-number">0{index + 1}</span>
            <h2>{type.title}</h2>
            <p>{type.description}</p>
            <div className="practice-meta"><span>{type.duration}</span><span>{type.difficulty}</span></div>
            <button className="button ghost" type="button" onClick={() => setMode(type.mode)}>Select round</button>
          </article>
        ))}
      </div>
      <div className="empty practice-note"><h3>A focused place to begin</h3><p>Choose a round, start the interview, and answer one question at a time with your AI interviewer.</p></div>
    </>
  );
}

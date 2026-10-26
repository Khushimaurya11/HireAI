import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { interviewApi, resumeApi } from '../services/api';
import { useInterviews } from '../contexts/InterviewContext';
import LiveInterview from '../components/LiveInterview';

export default function Interview() {
  const nav = useNavigate();
  const location = useLocation();
  const { active, setActive, refresh, resumeProfile, setResumeProfile } = useInterviews();
  const queryMode = new URLSearchParams(location.search).get('mode');
  const activeSession = new URLSearchParams(location.search).get('session') === 'active';
  const [step, setStep] = useState(active && activeSession ? 'live' : resumeProfile ? 'setup' : 'resume');
  const [profile, setProfile] = useState(resumeProfile || null);
  const [mode, setMode] = useState(queryMode || active?.mode || 'Behavioral');
  const [interview, setInterview] = useState(active || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [completedInterview, setCompletedInterview] = useState(null);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await resumeApi.upload(file);
      setProfile(response.data.profile);
      setResumeProfile(response.data.profile, file.name);
      setStep('setup');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Resume upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await interviewApi.start({ mode });
      setInterview(response.data.interview);
      setActive(response.data.interview);
      setStep('live');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not start interview.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (result) => {
    setCompletedInterview(result);
    setActive(null);
    await refresh();
  };

  const exit = () => {
    setActive(null);
    nav('/dashboard');
  };

  if (step === 'live' && interview) {
    return completedInterview ? (
      <section className="interview-complete panel">
        <span className="eyebrow">SESSION COMPLETE</span>
        <h1>That was a <em>strong round.</em></h1>
        <p className="lead">You answered {completedInterview.questions.filter((question) => question.candidateAnswer?.trim()).length} of {completedInterview.questions.length} questions.</p>
        <div className="completion-actions">
          <button className="button primary" type="button" onClick={() => nav(`/results/${completedInterview._id}`)}>Review results</button>
          <button className="button ghost" type="button" onClick={() => nav('/dashboard')}>Return to dashboard</button>
        </div>
        <div className="completion-transcript">
          <div className="panel-head"><h2>Answer summary</h2></div>
          {completedInterview.questions.map((question, index) => (
            <article key={question.questionId}><small>QUESTION {index + 1}</small><strong>{question.question}</strong><p>{question.candidateAnswer}</p></article>
          ))}
        </div>
      </section>
    ) : (
      <LiveInterview interview={interview} mode={interview.mode} onComplete={finish} onExit={exit} />
    );
  }

  return (
    <div className="interview">
      <span className="eyebrow">PREPARE YOUR SESSION</span>
      {step === 'resume' && (
        <>
          <h1>Let's start with<br /><em>your story.</em></h1>
          <p className="lead">A few details help us make each question feel relevant.</p>
          <label className="upload">
            <input type="file" accept="application/pdf" onChange={upload} />
            <b>{busy ? 'Reading your resume…' : 'Drop your resume here'}</b>
            <span>PDF only · up to 10 MB</span>
          </label>
        </>
      )}
      {step === 'setup' && (
        <>
          <h1>Set the <em>tone.</em></h1>
          <p className="lead">A {mode.toLowerCase()} session with five questions grounded in your profile.</p>
          <div className="mode-grid">
            {['Technical', 'HR', 'Behavioral', 'Resume Based', 'Mock Placement Interview'].map((item) => (
              <button className={`mode ${mode === item ? 'selected' : ''}`} onClick={() => setMode(item)} key={item} type="button">
                <b>{item}</b>
                <span>{item === 'Technical' ? 'Fundamentals, trade-offs, and problem solving.' : item === 'HR' ? 'Motivation, communication, and role fit.' : item === 'Behavioral' ? 'Stories, collaboration, and growth.' : item === 'Resume Based' ? 'Projects, decisions, and impact.' : 'A focused campus-style round.'}</span>
              </button>
            ))}
          </div>
          <button disabled={busy || !['Technical', 'HR', 'Mixed'].includes(mode)} className="button primary" onClick={start} type="button">{busy ? 'Preparing your interview…' : 'Start Interview · 50 credits'}</button>
        </>
      )}
      {message && <p className="voice-error" role="alert">{message}</p>}
      {profile && step === 'setup' && <p className="muted">Using your parsed resume to shape each question.</p>}
    </div>
  );
}

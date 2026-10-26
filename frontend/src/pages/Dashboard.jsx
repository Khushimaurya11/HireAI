import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useInterviews } from '../contexts/InterviewContext';
import { authApi, interviewApi, learningApi, paymentApi } from '../services/api';
import AIInterviewer from '../components/AIInterviewer';
import ResumeUpload from '../components/ResumeUpload';
import ResumeSummary from '../components/ResumeSummary';
import ReadinessPanel from '../components/ReadinessPanel';
import QuickActions from '../components/QuickActions';
import PerformanceCard from '../components/PerformanceCard';
import StatRow from '../components/StatRow';
import InterviewTypeSelector from '../components/InterviewTypeSelector';

const Head = ({ label, title, action, eyebrow = 'HIREAI WORKSPACE' }) => <><div className="topbar">{label}</div><section className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{action}</section></>;

export function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { interviews, resumeProfile, resumeFilename, setResumeProfile, setActive } = useInterviews();
  const [mode, setMode] = useState('Technical');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const startInterview = async () => {
    if (!resumeProfile) {
      nav('/resume');
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

  const recent = interviews[0];
  const checks = [
    ['API', 'LIVE', 'active'],
    ['Speech Input', typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) ? 'READY' : 'LIMITED', 'standby'],
    ['Resume Profile', resumeProfile ? 'SYNCED' : 'PENDING', resumeProfile ? 'active' : 'standby'],
  ];

  return <><Head label="COMMAND CENTER / OVERVIEW" title={`Good morning, ${user?.name?.split(' ')[0] || 'there'}.`} action={<div className="head-actions"><Link className="button ghost" to="/resume">Update resume</Link><Link className="button primary glow-button" to="/practice">Start AI interview <span>↗</span></Link></div>} /><section className="dashboard-intro"><div><span className="eyebrow">HIREAI / INTERVIEW COMMAND CENTER</span><h2>Prepare for the interview<br /><em>you actually want.</em></h2><p>Turn your resume into a personalized session and understand exactly where you need to improve.</p></div><div className="flow-strip"><span className="flow-active">Resume</span><b>→</b><span>Interview</span><b>→</b><span>Feedback</span></div></section><div className="dashboard-main-grid"><div className="dashboard-left">{resumeProfile ? <ResumeSummary profile={resumeProfile} filename={resumeFilename} /> : <section className="panel resume-cta"><div><span className="eyebrow">RESUME INTELLIGENCE / STEP 01</span><h2>Upload resume to activate your interviewer.</h2><p className="muted">Your profile powers private, resume-grounded interview prompts and readiness scoring.</p></div><ResumeUpload user={user} onParsed={setResumeProfile} /></section>}<QuickActions /><PerformanceCard interview={recent} /></div><div className="dashboard-right"><ReadinessPanel profile={resumeProfile} interviews={interviews} /><AIInterviewer compact state={busy ? 'analyzing' : 'standby'} title="AI Interviewer" subtitle={busy ? 'Preparing your private interview session' : 'Ready to simulate your next interview panel'} /><section className="panel system-status"><div className="panel-head"><div><span className="eyebrow">AI INTERVIEW ENGINE</span><h2>System signals</h2></div><span className="status active">● LIVE</span></div><div className="status-grid">{checks.map(([name, value, tone]) => <article key={name}><span>{name}</span><strong className={tone}>{value}</strong></article>)}</div></section></div></div><section className="panel question-setup"><div><span className="eyebrow">INTERVIEW ENGINE / STEP 02</span><h2>Start a private role-aligned interview in one click.</h2></div><InterviewTypeSelector value={mode} onChange={setMode} /><button className="button primary" disabled={busy || !resumeProfile} onClick={startInterview}>{busy ? 'Preparing your interview…' : 'Start Interview'} <span>↗</span></button>{message && <p className="demo-notice">{message}</p>}</section><StatRow interviews={interviews} /></>;
}

export function History() {
  const [history, setHistory] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const loadHistory = async () => {
    setLoading(true); setError('');
    try { const response = await interviewApi.history(); setHistory(response.data.history || []); } catch { setError('Interview history could not be loaded. Please try again.'); } finally { setLoading(false); }
  };
  React.useEffect(() => { loadHistory(); }, []);
  return <><Head label="HISTORY" title="Session timeline and score trends." action={<Link className="button primary" to="/practice">New session</Link>} eyebrow="TRAINING LOG" /><div className="panel history-list">{loading ? <div className="empty compact-empty"><p>Loading history…</p></div> : error ? <div className="empty compact-empty"><p>{error}</p><button className="button ghost" onClick={loadHistory}>Retry</button></div> : history.length ? <><div className="history-head"><span>Interview type</span><span>Score</span><span>Date</span><span>Questions</span><span>Status</span><span>View</span></div>{history.map((item) => <Link className="history-item" to={`/results/${item.id}`} key={item.id}><strong>{item.mode || 'Interview'}</strong><b>{Number.isFinite(Number(item.score)) ? `${(Number(item.score) * 10).toFixed(0)}%` : '—'}</b><span>{new Date(item.createdAt).toLocaleDateString()}</span><span>{item.answeredQuestions}/{item.totalQuestions}</span><span className="status success">{item.status}</span><i>View →</i></Link>)}</> : <div className="empty compact-empty"><h3>No session history yet</h3><p>Complete one practice round and your timeline will appear here.</p><Link className="button primary" to="/practice">Start practicing</Link></div>}</div></>;
}

export function Learning() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await learningApi.recommendations();
      setRecommendations(response.data.recommendations || []);
    } catch {
      setRecommendations([]);
      setError('Learning recommendations could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) loadRecommendations();
  }, [user]);

  const sections = recommendations.map((item, index) => [
    `${item.priority || 'recommended'} priority`,
    item.topic,
    `${item.reason} ${item.recommendation}`,
    Math.max(0, Math.min(100, Math.round((item.averageScore || 0) * 10))),
    item.occurrences > 1 ? `${item.occurrences} signals` : 'Practice now',
  ]);

  return <><Head label="LEARNING" title="Targeted boosters for interview readiness." eyebrow="SKILL TRAINING" />
    {loading && <div className="empty compact-empty"><p>Loading recommendations…</p></div>}
    {!loading && error && <div className="empty compact-empty"><p>{error}</p><button className="button ghost" onClick={loadRecommendations}>Retry</button></div>}
    {!loading && !error && !sections.length && <div className="empty compact-empty"><h3>No learning gaps yet</h3><p>Complete and evaluate an interview to receive preparation recommendations based on your performance.</p></div>}
    {!loading && !error && sections.length > 0 && <div className="learning-sections">{sections.map(([section, title, description, progress, time]) => <section className="panel learning-row" key={`${title}-${section}`}><div><small>{section.toUpperCase()}</small><h2>{title}</h2><p className="muted">{description}</p><div className="progress"><i style={{ width: `${progress}%` }} /></div></div><span>{time}</span><button className="button ghost">Start</button></section>)}</div>}
  </>;
}

export function Wallet() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const buy = async (plan) => {
    setBusy(plan);
    try {
      const response = await paymentApi.order(plan);
      if (!window.Razorpay) throw new Error('Razorpay checkout is not loaded.');
      const checkout = new window.Razorpay({
        ...response.data.order,
        key: response.data.keyId,
        handler: async (value) => {
          const verified = await paymentApi.verify(value);
          setUser({ ...user, credits: verified.data.credits });
          setMessage('Payment verified. Credits added.');
        },
      });
      checkout.open();
    } catch (error) {
      setMessage(error.response?.data?.error || error.message);
    } finally {
      setBusy('');
    }
  };

  return <><Head label="WALLET" title="Keep your interview sessions powered." eyebrow="CREDIT MANAGEMENT" /><div className="credits-grid"><section className="wallet-card"><small>AVAILABLE CREDITS</small><strong>{user?.credits || 0}</strong><p className="wallet-message">Credits are consumed when starting personalized interview rounds.</p></section><section className="panel pack-list"><span className="eyebrow">TOP UP</span><h2>Choose your pack</h2>{[['Starter', 150, 100], ['Pro', 650, 500]].map(([plan, credits, price]) => <div className="pack-row" key={plan}><div><strong>{plan}</strong><span>{credits} credits · ₹{price}</span></div><button className="button primary" disabled={!!busy} onClick={() => buy(plan)}>{busy === plan ? 'Opening…' : 'Buy pack'}</button></div>)}</section></div>{message && <p className="demo-notice">{message}</p>}</>;
}

export function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await authApi.updateProfile({ name: name.trim() });
      setUser(response.data.user);
      setMessage('Profile saved.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Profile could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  return <><Head label="SETTINGS" title="Tune your workspace identity." eyebrow="ACCOUNT" /><section className="panel settings"><span className="eyebrow">PROFILE</span><h2>Account details</h2><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input value={user?.email || ''} disabled /></label><button className="button primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>{message && <p className="muted">{message}</p>}</section></>;
}

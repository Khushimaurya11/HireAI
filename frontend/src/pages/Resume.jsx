import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useInterviews } from '../contexts/InterviewContext';
import AIInterviewer from '../components/AIInterviewer';
import ResumeUpload from '../components/ResumeUpload';
import ResumeProfile from '../components/ResumeProfile';

export default function Resume() {
  const { user } = useAuth();
  const { resumeProfile, resumeFilename, setResumeProfile } = useInterviews();
  return <><div className="topbar">RESUME INTELLIGENCE</div><section className="page-head compact-head"><div><span className="eyebrow">YOUR STORY FIRST</span><h1>Parse your resume into interview signals.</h1><p className="muted">We extract skills, projects, and experience to personalize prompts and scoring across every round.</p></div><Link className="button primary" to="/practice">Start interview</Link></section><div className="resume-page-grid"><div><ResumeUpload user={user} onParsed={setResumeProfile} /><div className="resume-file-card"><span className="eyebrow">CURRENT DOCUMENT</span><strong>{resumeFilename || 'No resume uploaded'}</strong><span>{resumeProfile ? '✓ Parsed successfully' : 'Upload a PDF to begin'}</span></div><AIInterviewer compact state={resumeProfile ? 'standby' : 'analyzing'} title="Resume Analyst" subtitle={resumeProfile ? 'Profile is synced and ready for your private interview' : 'Upload a resume to begin extracting profile signals'} /></div><div>{resumeProfile ? <ResumeProfile profile={resumeProfile} /> : <section className="panel analysis-placeholder"><span className="eyebrow">RESUME ANALYSIS</span><h2>Your analysis will appear here.</h2><p className="muted">Upload a resume and we will identify skills, projects, experience, and preparation topics.</p></section>}</div></div></>;
}

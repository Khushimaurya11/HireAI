import React from 'react';
import { Link } from 'react-router-dom';

export default function ResumeSummary({ profile, filename }) {
  const skills = profile?.skills || [];
  const projects = profile?.projects || [];
  return (
    <section className="panel resume-summary">
      <div className="panel-head">
        <div><span className="eyebrow">RESUME INTELLIGENCE</span><h2>{filename || 'Resume profile'}</h2></div>
        <span className="status success">✓ Parsed</span>
      </div>
      <div className="resume-summary-grid">
        <div><small>SKILL SIGNALS</small><p>{skills.length ? skills.join(' · ') : 'Upload a resume to detect skills'}</p></div>
        <div><small>PROJECT CONTEXT</small><p>{projects.length ? projects.join(' · ') : 'Projects will appear here'}</p></div>
        <div><small>EXPERIENCE BASELINE</small><p>{profile?.experience || profile?.role || 'Not detected yet'}</p></div>
      </div>
      <div className="inline-actions"><Link className="button ghost" to="/resume">Open full profile</Link><Link className="text-link" to="/resume">Replace resume →</Link></div>
    </section>
  );
}

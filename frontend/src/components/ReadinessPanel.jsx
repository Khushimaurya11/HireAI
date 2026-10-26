import React from 'react';
import { Link } from 'react-router-dom';

export default function ReadinessPanel({ profile, interviews }) {
  const practiceCount = interviews.length;
  const completion = profile ? Math.min(100, 48 + Math.min(practiceCount * 10, 30)) : 18;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (completion / 100) * circumference;
  return (
    <section className="panel readiness-panel">
      <div className="panel-head"><div><span className="eyebrow">READINESS</span><h2>Interview readiness</h2></div></div>
      <div className="readiness-ring">
        <svg viewBox="0 0 120 120" aria-label={`Readiness ${completion} percent`}>
          <circle cx="60" cy="60" r={radius} className="readiness-ring-track" />
          <circle cx="60" cy="60" r={radius} className="readiness-ring-value" strokeDasharray={circumference} strokeDashoffset={progress} />
        </svg>
        <strong>{completion}<small>%</small></strong>
      </div>
      <div className="checklist">
        <span className={profile ? 'done' : ''}>{profile ? '✓' : '○'} Resume {profile ? 'uploaded' : 'needed'}</span>
        <span className={profile ? 'done' : ''}>{profile ? '✓' : '○'} Profile {profile ? 'parsed' : 'waiting'}</span>
        <span className={practiceCount ? 'done' : ''}>{practiceCount ? '✓' : '○'} Practice {practiceCount ? `${practiceCount} session${practiceCount > 1 ? 's' : ''}` : 'not started'}</span>
      </div>
      <Link className="button primary wide" to={profile ? '/practice' : '/resume'}>{profile ? 'Continue practice' : 'Complete profile'}</Link>
    </section>
  );
}

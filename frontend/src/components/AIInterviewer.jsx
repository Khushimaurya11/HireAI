import React from 'react';

const modes = {
  standby: { label: 'SYSTEM READY', tone: 'standby', message: 'Ready when you are. Your interviewer is on standby.' },
  listening: { label: 'LISTENING', tone: 'live', message: 'Voice input detected. Capturing response.' },
  analyzing: { label: 'THINKING', tone: 'active', message: 'Evaluating clarity, structure, and impact.' },
  speaking: { label: 'SPEAKING', tone: 'live', message: 'Your AI interviewer is asking the next question.' },
  evaluating: { label: 'EVALUATING', tone: 'active', message: 'Scoring your response against the role signals.' },
};

export default function AIInterviewer({
  state = 'standby',
  title = 'AI Interviewer',
  subtitle = 'Adaptive interviewer tuned to your profile',
  compact = false,
}) {
  const mode = modes[state] || modes.standby;
  return (
    <section className={`panel ai-interviewer ${compact ? 'compact' : ''} ${mode.tone}`}>
      <div className="ai-header">
        <div>
          <span className="eyebrow">AI INTERVIEWER</span>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <span className={`status ${mode.tone}`}>{mode.label}</span>
      </div>
      <div className="ai-visual">
        <div className="ai-orbit orbit-one" />
        <div className="ai-orbit orbit-two" />
        <svg viewBox="0 0 180 180" className="ai-avatar" role="img" aria-label="AI interviewer avatar">
          <defs>
            <linearGradient id="avatarGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9a64" />
              <stop offset="100%" stopColor="#ff6437" />
            </linearGradient>
          </defs>
          <circle className="ring ring-outer" cx="90" cy="90" r="74" />
          <circle className="ring ring-middle" cx="90" cy="90" r="58" />
          <circle className="ring ring-inner" cx="90" cy="90" r="42" />
          <circle className="core" cx="90" cy="90" r="28" fill="url(#avatarGlow)" />
          <path d="M78 88 L102 88" className="face-line" />
          <path d="M82 98 Q90 105 98 98" className="face-line" />
        </svg>
        <span className="ai-particle particle-one" />
        <span className="ai-particle particle-two" />
        <span className="ai-particle particle-three" />
        <div className="ai-bars" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <i key={value} style={{ animationDelay: `${value * 0.12}s` }} />
          ))}
        </div>
      </div>
      <p className="ai-message"><span className="pulse-dot" />{mode.message}</p>
    </section>
  );
}

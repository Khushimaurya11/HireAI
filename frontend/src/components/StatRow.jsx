import React from 'react';

export default function StatRow({ interviews }) {
  const scores = interviews.map((item) => Number(item.finalScore)).filter(Number.isFinite);
  const average = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length * 10).toFixed(0) : '—';
  const totalQuestions = interviews.reduce((total, item) => total + (item.answeredQuestions || 0), 0);
  return <section className="stat-row">{[['ROUNDS COMPLETED', String(interviews.length).padStart(2, '0')], ['READINESS SCORE', `${average}%`], ['QUESTIONS ANSWERED', totalQuestions], ['MOMENTUM', interviews.length ? `${Math.min(9, interviews.length)} day streak` : '—']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</section>;
}

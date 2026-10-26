import React from 'react';
import { Link } from 'react-router-dom';

export default function PerformanceCard({ interview }) {
  const score = interview ? Number(interview.finalScore || 0) * 10 : 0;
  const metric = (value) => `${Math.max(0, Math.min(100, Number(value || 0) * 10))}%`;
  return <section className="panel performance-card"><div className="panel-head"><div><span className="eyebrow">PERFORMANCE SIGNALS</span><h2>{interview ? 'Latest interview analytics' : 'Performance dashboard empty'}</h2></div>{interview && <strong className="performance-score">{score.toFixed(0)}%</strong>}</div>{interview ? <><div className="performance-meta"><strong>{interview.mode || 'Technical'} interview</strong><span>{interview.totalQuestions || 0} questions · {new Date(interview.createdAt).toLocaleDateString()}</span></div><div className="metric-bars">{[['Communication', interview.avgCommunication], ['Technical depth', interview.avgCorrectness], ['Confidence', interview.avgConfidence]].map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: metric(value) }} /></i></div>)}</div><Link className="text-link" to={`/results/${interview._id}`}>Open detailed analysis →</Link></> : <div className="empty compact-empty"><p>No completed interview yet. Finish one round to unlock strengths, improvements, and trend bars.</p><Link className="button primary" to="/practice">Start first round</Link></div>}</section>;
}

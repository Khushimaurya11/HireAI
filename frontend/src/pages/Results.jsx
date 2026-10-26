import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { interviewApi } from '../services/api';
import { useInterviews } from '../contexts/InterviewContext';

export default function Results() {
  const { id } = useParams(), { interviews } = useInterviews(), interview = interviews.find((item) => item._id === id) || (!id ? interviews[0] : null);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    interviewApi.result(id).then((response) => setResult(response.data.result)).catch((requestError) => setError(requestError.response?.data?.error || 'Could not load interview result'));
  }, [id]);
  if (error) return <div className="empty"><h2>{error}</h2><Link to="/practice">Start a practice session</Link></div>;
  if (id && !result) return <div className="empty"><h2>Loading result…</h2></div>;
  if (!result && !interview) return <div className="empty"><h2>Result not found</h2><Link to="/practice">Start a practice session</Link></div>;
  const data = result || interview;
  const score = Number(data.overallScore ?? data.finalScore ?? 0);
  const scorePercent = Math.max(0, Math.min(100, score * 10));
  const metrics = [['Communication', data.avgCommunication], ['Technical depth', data.avgTechnicalDepth ?? data.avgCorrectness], ['Confidence', data.avgConfidence], ['Relevance', data.avgRelevance ?? data.avgCorrectness]];
  const questionResults = result?.questionResults || data.questions || [];
  return <><div className="topbar">SESSION RESULTS</div><section className="page-head"><div><span className="eyebrow">{data.mode || 'Interview'} · {new Date(data.createdAt || data.completedAt).toLocaleDateString()}</span><h1>Performance debrief and<br /><em>next-step guidance.</em></h1></div><div className="score-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" className="score-ring-track" /><circle cx="60" cy="60" r="48" className="score-ring-value" style={{ strokeDasharray: 301.59, strokeDashoffset: 301.59 - (scorePercent / 100) * 301.59 }} /></svg><div><strong>{score.toFixed(1)}</strong><small>/10</small></div></div></section><div className="result-metrics">{metrics.map(([label, value]) => <div key={label}><small>{label.toUpperCase()}</small><strong>{Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—'}</strong><span>/ 10</span></div>)}</div><div className="results-summary"><article><small>STRENGTHS</small><p>{(data.strengths || ['No strengths recorded yet.']).join(' · ')}</p></article><article><small>AREAS TO IMPROVE</small><p>{(data.improvements || data.weaknesses || ['No improvement suggestions recorded yet.']).join(' · ')}</p></article></div><div className="results-next"><small>SUGGESTED NEXT PRACTICE</small><strong>Use the feedback from each answer to make your next response more specific and outcome-focused.</strong></div><div className="results-grid">{questionResults.map((question, index) => <article className="result" key={question.questionId || index}><small>QUESTION {index + 1} · {question.difficulty}</small><h3>{question.question}</h3><p>{question.answer || question.feedback || 'Answer submitted successfully.'}</p><p>{question.improvement || ''}</p><div className="score-line"><span>{question.evaluationSource === 'fallback' ? 'Heuristic evaluation' : 'AI evaluation'}</span><b>{Number.isFinite(Number(question.overallScore)) ? Number(question.overallScore).toFixed(1) : '—'}</b></div></article>)}</div><Link className="button primary" to="/practice">Practice again</Link></>;
}

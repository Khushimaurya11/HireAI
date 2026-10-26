import React from 'react';
import { Link } from 'react-router-dom';

const actions = [
  ['01', 'Resume intelligence', 'Upload, parse, and refresh role context', '/resume'],
  ['02', 'Question synthesis', 'Generate targeted rounds from your profile', '/practice'],
  ['03', 'Live interview room', 'Run a timed round with AI prompts', '/interview'],
  ['04', 'Learning boosters', 'Reinforce weak areas with guided drills', '/learning'],
];

export default function QuickActions() {
  return <section className="quick-actions">{actions.map(([number, title, description, to]) => <Link to={to} className="quick-action" key={title}><span>{number}</span><strong>{title}</strong><small>{description}</small><b>→</b></Link>)}</section>;
}

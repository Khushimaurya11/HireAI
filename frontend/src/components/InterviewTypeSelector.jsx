import React from 'react';

const types = [
  { id: 'Technical', title: 'Technical', text: 'Skills, projects, trade-offs and problem solving.' },
  { id: 'HR', title: 'HR', text: 'Motivation, communication and role fit.' },
  { id: 'Mixed', title: 'Mixed', text: 'A balanced technical and people-focused round.' },
];

export default function InterviewTypeSelector({ value, onChange }) {
  return <div className="interview-type-selector">
    {types.map((type) => <button type="button" className={`type-choice ${value === type.id ? 'selected' : ''}`} disabled={type.disabled} onClick={() => onChange(type.id)} key={type.id}>
      <span><b>{type.title}</b></span>
      <em>{type.text}</em>
    </button>)}
  </div>;
}

import React from 'react';

const fields = [
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['experience', 'Experience'],
  ['education', 'Education'],
];

function valueFor(profile, key) {
  const value = profile?.[key];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export default function ResumeProfile({ profile }) {
  return (
    <section className="resume-profile">
      <div className="section-heading">
        <div><span className="eyebrow">STEP 02 · EXTRACTED PROFILE</span><h2>Your Resume Profile</h2></div>
        <span className="profile-status">Parsed from resume</span>
      </div>
      <div className="profile-grid">
        {fields.map(([key, label]) => {
          const values = valueFor(profile, key);
          return <article className="profile-card" key={key}>
            <small>{label}</small>
            {values.length ? <ul>{values.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Not found in this resume.</p>}
          </article>;
        })}
      </div>
    </section>
  );
}

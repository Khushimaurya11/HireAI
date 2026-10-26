import React, { useRef, useState } from 'react';
import { resumeApi } from '../services/api';

export default function ResumeUpload({ user, onParsed }) {
  const inputRef = useRef(null);
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setFilename(file.name);
    setMessage('');
    setStatus('uploading');
    try {
      const response = await resumeApi.upload(file);
      onParsed(response.data.profile, file.name);
      setStatus('success');
      setMessage('Resume parsed successfully. Your profile is ready.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Resume upload failed. Please try a PDF under 8 MB.');
    }
  };

  const onChange = (event) => upload(event.target.files?.[0]);
  const onDrop = (event) => {
    event.preventDefault();
    upload(event.dataTransfer.files?.[0]);
  };

  return (
    <div className={`resume-upload resume-upload-${status}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={onChange} />
      <div className="resume-upload-copy">
        <span className="eyebrow">STEP 01 · YOUR RESUME</span>
        <h2>{status === 'uploading' ? 'Parsing your resume…' : status === 'success' ? 'Resume profile ready' : 'Start with your resume'}</h2>
        <p>Drop a file here or choose one to extract your skills, projects, experience and education.</p>
        <button type="button" className="button primary" onClick={() => inputRef.current?.click()} disabled={status === 'uploading'}>
          {status === 'uploading' ? 'Parsing resume…' : 'Upload Resume'}
        </button>
        <small>PDF / DOC / DOCX · current parser accepts PDF · maximum 8 MB</small>
      </div>
      <div className="resume-upload-file">
        <span className="resume-file-mark">↥</span>
        <strong>{filename || 'Drag and drop your file here'}</strong>
        <span>{message || 'Your file stays tied to your authenticated workspace.'}</span>
      </div>
    </div>
  );
}

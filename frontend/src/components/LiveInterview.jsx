import React, { useCallback, useEffect, useRef, useState } from 'react';
import { interviewApi } from '../services/api';
import { getSpeechRecognition, isSpeechSynthesisSupported, speakText, stopSpeaking } from '../services/voice';

const labels = {
  loading: 'Preparing question...',
  speaking: 'AI is speaking...',
  ready: 'Ready for your answer',
  listening: 'Listening to your answer...',
  processing: 'Processing your response...',
};

function Message({ speaker, text, interim = false }) {
  return <div className={`transcript-message ${speaker} ${interim ? 'interim' : ''}`}><span className="transcript-label">{speaker === 'ai' ? 'AI interviewer' : 'You'}{interim ? ' · speaking' : ''}</span><p>{text}</p></div>;
}

export default function LiveInterview({ interview, mode, onComplete, onExit }) {
  const [question, setQuestion] = useState(interview.currentQuestion || null);
  const [state, setState] = useState('loading');
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const answerRef = useRef('');
  const submittedRef = useRef(false);

  useEffect(() => { answerRef.current = answer; }, [answer]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, interim]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const speakCurrentQuestion = useCallback(async (currentQuestion) => {
    if (!currentQuestion) return;
    stopListening();
    stopSpeaking();
    setState('loading');
    setError('');
    setAnswer('');
    answerRef.current = '';
    submittedRef.current = false;
    setInterim('');
    setMessages((current) => current.some((message) => message.questionId === currentQuestion.questionId)
      ? current
      : [...current, { speaker: 'ai', text: currentQuestion.question, questionId: currentQuestion.questionId }]);
    if (muted || !isSpeechSynthesisSupported()) {
      setState('ready');
      return;
    }
    setState('speaking');
    try {
      await speakText(currentQuestion.question);
      setState('ready');
    } catch {
      setError('Voice playback was unavailable. You can read the question and answer by text.');
      setState('ready');
    }
  }, [muted, stopListening]);

  useEffect(() => {
    if (!question) {
      interviewApi.current(interview._id).then((response) => setQuestion(response.data.currentQuestion)).catch((requestError) => setError(requestError.response?.data?.error || 'Could not load the current question.'));
      return undefined;
    }
    speakCurrentQuestion(question);
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [question]); // The server supplies a new question only after submission.

  const startListening = () => {
    if (state === 'speaking' || state === 'processing' || busy) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Use the text answer box instead.');
      return;
    }
    setError('');
    stopListening();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setState('listening');
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) {
        const next = `${answerRef.current} ${finalText}`.trim();
        answerRef.current = next;
        setAnswer(next);
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone access was denied. Allow access or use text input.' : `Speech recognition error: ${event.error}.`);
      setState('ready');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim('');
      setState((current) => current === 'listening' ? 'ready' : current);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError('Could not start the microphone. Use the text answer box instead.');
      setState('ready');
    }
  };

  const submitAnswer = async () => {
    const finalAnswer = answerRef.current.trim();
    if (!finalAnswer || busy || submittedRef.current || !question) {
      if (!finalAnswer) setError('Add an answer before submitting.');
      return;
    }
    submittedRef.current = true;
    stopListening();
    stopSpeaking();
    setBusy(true);
    setState('processing');
    setError('');
    setMessages((current) => [...current, { speaker: 'candidate', text: finalAnswer }]);
    try {
      const response = await interviewApi.answer(interview._id, {
        questionId: question.questionId,
        questionIndex: question.questionNumber - 1,
        answer: finalAnswer,
      });
      if (response.data.completed) {
        const completed = await interviewApi.complete(interview._id);
        onComplete(completed.data.interview);
      } else {
        setQuestion(response.data.nextQuestion);
      }
    } catch (requestError) {
      submittedRef.current = false;
      setState('ready');
      setError(requestError.response?.data?.error || 'Could not submit your answer.');
    } finally {
      setBusy(false);
    }
  };

  const repeat = () => {
    if (state === 'speaking' || !question) return;
    speakCurrentQuestion(question);
  };

  const endSession = () => {
    stopListening();
    stopSpeaking();
    onExit();
  };

  const progress = question ? ((question.questionNumber - 1) / interview.totalQuestions) * 100 : 0;
  const listening = state === 'listening';

  return (
    <div className="live-interview">
      <div className="live-interview-heading"><div><span className="eyebrow">LIVE INTERVIEW · {mode.toUpperCase()}</span><h1>Your interviewer is <em>ready.</em></h1></div><button className="button ghost" type="button" onClick={endSession}>End interview</button></div>
      <div className="live-progress"><div className="live-progress-track"><span style={{ width: `${progress}%` }} /></div><span>Question {question?.questionNumber || 1} of {interview.totalQuestions}</span></div>
      <div className="live-interview-grid">
        <section className={`panel live-avatar-panel ${listening ? 'is-listening' : ''} ${state === 'speaking' ? 'is-speaking' : ''}`}>
          <div className="live-status"><span className="pulse-dot" />{labels[state] || labels.ready}</div>
          <div className="live-avatar" aria-hidden="true"><div className="live-avatar-core">AI</div></div>
          <p className="muted live-hint">{listening ? 'Speak naturally. Stop when you have finished.' : 'Your microphone stays off while the AI is speaking.'}</p>
          <div className="live-controls">
            <button className={`button ${listening ? 'recording' : 'primary'}`} type="button" disabled={state === 'speaking' || busy || !question} onClick={listening ? stopListening : startListening}>{listening ? 'Stop answering' : 'Start answering'}</button>
            <button className="button ghost" type="button" aria-pressed={muted} onClick={() => setMuted((value) => !value)}>{muted ? 'Enable AI voice' : 'Mute AI voice'}</button>
            <button className="button ghost" type="button" disabled={state === 'speaking' || busy || !question} onClick={repeat}>Repeat question</button>
          </div>
        </section>
        <section className="panel live-transcript-panel">
          <div className="panel-head"><div><span className="eyebrow">LIVE TRANSCRIPT</span><h2>Conversation</h2></div><span className="status live">{listening ? 'MIC ON' : 'LIVE'}</span></div>
          <div className="transcript-list" aria-live="polite">{messages.map((message, index) => <Message key={`${message.questionId || message.text}-${index}`} {...message} />)}{interim && <Message speaker="candidate" text={interim} interim />}<div ref={endRef} /></div>
          <textarea value={answer} disabled={busy} onChange={(event) => { setAnswer(event.target.value); answerRef.current = event.target.value; }} placeholder="Type your answer if voice recognition is unavailable." aria-label="Your answer" />
          {error && <p className="voice-error" role="alert">{error}</p>}
          <button className="button primary transcript-submit" type="button" disabled={busy || state === 'speaking' || !question} onClick={submitAnswer}>{busy ? 'Processing…' : 'Submit answer'}</button>
        </section>
      </div>
    </div>
  );
}

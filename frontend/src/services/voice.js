const getSpeechSynthesis = () => (typeof window !== 'undefined' ? window.speechSynthesis : null);

let selectedVoice = null;

function chooseVoice() {
  const synthesis = getSpeechSynthesis();
  if (!synthesis) return null;
  const voices = synthesis.getVoices();
  selectedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en-')
    && /Google|Microsoft|Samantha|Alex/i.test(voice.name))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('en-'))
    || voices[0]
    || null;
  return selectedVoice;
}

export function isSpeechSynthesisSupported() {
  return Boolean(getSpeechSynthesis() && typeof window.SpeechSynthesisUtterance !== 'undefined');
}

export function speakText(text, { onStart, onEnd, onError } = {}) {
  const synthesis = getSpeechSynthesis();
  if (!isSpeechSynthesisSupported()) {
    const error = new Error('Text-to-speech is not supported in this browser.');
    onError?.(error);
    return Promise.reject(error);
  }

  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.96;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.voice = selectedVoice || chooseVoice();

  return new Promise((resolve, reject) => {
    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      onEnd?.();
      resolve();
    };
    utterance.onerror = (event) => {
      const error = new Error(event.error || 'Speech playback failed');
      onError?.(error);
      reject(error);
    };
    synthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  getSpeechSynthesis()?.cancel();
}

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognition());
}

if (typeof window !== 'undefined' && getSpeechSynthesis()) {
  getSpeechSynthesis().addEventListener('voiceschanged', chooseVoice);
  chooseVoice();
}

// Deterministic, dependency-free fallbacks so the API keeps working even
// without an OPENROUTER_API_KEY configured. Mirrors the logic used in the
// frontend's client-side demo mode, kept here so the server behaves the
// same way whether or not the LLM is wired up.

const SKILL_DICT = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C', 'React', 'Node.js', 'Express',
  'MongoDB', 'SQL', 'MySQL', 'PostgreSQL', 'HTML', 'CSS', 'Tailwind', 'Redux', 'Django', 'Flask',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'REST API', 'GraphQL',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Firebase',
  'Next.js', 'Vue', 'Angular', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Android',
  'Data Structures', 'Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks',
  'Figma', 'Linux', 'CI/CD', 'Jenkins', 'Spring Boot', '.NET', 'C#', 'Redis', 'WebSockets',
  'NLP', 'Computer Vision',
];

const ROLE_KEYWORDS = [
  'Software Engineer', 'Software Developer', 'Full Stack Developer', 'Frontend Developer',
  'Backend Developer', 'Web Developer', 'Data Analyst', 'Data Scientist',
  'Machine Learning Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer',
  'Android Developer', 'Cloud Engineer', 'QA Engineer', 'Business Analyst',
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractProfileHeuristic(text) {
  const norm = text.replace(/\s+/g, ' ');

  const role = ROLE_KEYWORDS.find((r) => new RegExp(escapeRegex(r), 'i').test(norm)) || 'Software Engineer';

  const skills = SKILL_DICT.filter((sk) => new RegExp(`\\b${escapeRegex(sk)}\\b`, 'i').test(norm));
  const uniqueSkills = [...new Set(skills)].slice(0, 12);

  let experience = 'Fresher / 0-1 yrs';
  const yrMatch = norm.match(/(\d+(\.\d+)?)\+?\s*(years|yrs)/i);
  if (yrMatch) {
    const y = parseFloat(yrMatch[1]);
    if (y >= 4) experience = '4+ years';
    else if (y >= 2) experience = '2-4 years';
    else if (y >= 1) experience = '1-2 years';
  }

  let projects = [];
  const projMatch = norm.match(/PROJECTS?[:\s](.{0,400})/i);
  if (projMatch) {
    projects = projMatch[1]
      .split(/(?=[A-Z][a-zA-Z]{3,}(?:\s[A-Z]?[a-z]*){0,4}[:\-\u2013])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, 3);
  }
  if (!projects.length) projects = ['Not clearly detected \u2014 candidate can edit this in the app'];

  return {
    role,
    experience,
    skills: uniqueSkills.length ? uniqueSkills : ['Problem Solving', 'Communication'],
    projects,
  };
}

const HR_TEMPLATES = {
  easy: [
    "Tell me a little about yourself and what you're looking for in this role.",
    'What made you apply for a {role} position specifically?',
  ],
  medium: [
    'Describe a time you disagreed with a teammate. How did you handle it?',
    "Tell me about a project that didn't go as planned. What did you do?",
  ],
  hard: ['Where do you want to be in your career five years from now, and how does this role fit that plan?'],
};

function techTemplates(skills) {
  const s = skills.length ? skills : ['your core stack'];
  const pick = (i) => s[i % s.length];
  return {
    easy: [
      `Walk me through a project on your resume that used ${pick(0)}. What was your specific contribution?`,
      `In plain terms, how would you explain ${pick(1)} to someone non-technical?`,
    ],
    medium: [
      `Suppose a feature built with ${pick(0)} starts slowing down under load \u2014 how would you go about diagnosing it?`,
      `What trade-offs would you weigh when choosing ${pick(1)} over an alternative for a new project?`,
    ],
    hard: [
      `Design, at a high level, how you'd scale a system built with ${pick(0)} and ${pick(1)} to handle 10x the current traffic \u2014 what breaks first, and what do you change?`,
    ],
  };
}

function generateQuestionsHeuristic(profile, mode) {
  const bank = mode === 'HR' ? HR_TEMPLATES : techTemplates(profile.skills || []);
  const fill = (t) => t.replace('{role}', profile.role || 'this role');
  return [
    { question: fill(bank.easy[0]), difficulty: 'Easy', timeLimit: 60 },
    { question: fill(bank.easy[1] || bank.easy[0]), difficulty: 'Easy', timeLimit: 60 },
    { question: fill(bank.medium[0]), difficulty: 'Medium', timeLimit: 90 },
    { question: fill(bank.medium[1] || bank.medium[0]), difficulty: 'Medium', timeLimit: 90 },
    { question: fill(bank.hard[0]), difficulty: 'Hard', timeLimit: 120 },
  ];
}

const FILLERS = ['um', 'uh', 'like', 'actually', 'basically', 'you know', 'sort of', 'kind of'];
const HEDGES = ['i think', 'maybe', 'not sure', 'probably', 'i guess', "i don't know", 'kind of'];
const ASSERTIVE = ['i built', 'i designed', 'i led', 'i implemented', 'i solved', 'i owned', 'definitely', 'specifically', 'for example'];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function scoreAnswerHeuristic(questionText, answerText, skills = []) {
  const text = (answerText || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wc = words.length;
  const lower = text.toLowerCase();

  let correctness = wc === 0 ? 0 : 3.5;
  if (wc > 0) {
    correctness += Math.min(wc / 22, 3.2);
    const relevantSkills = skills.filter((sk) => lower.includes(String(sk).toLowerCase()));
    correctness += Math.min(relevantSkills.length * 0.6, 2.2);
    const qWords = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter((w) => w.length > 5);
    const overlap = qWords.filter((w) => lower.includes(w)).length;
    correctness += Math.min(overlap * 0.3, 1.2);
  }
  correctness = clamp(correctness, 0, 10);

  let communication = wc === 0 ? 0 : 4;
  if (wc > 0) {
    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 3).length;
    communication += sentences >= 2 ? 2 : sentences * 1;
    if (wc >= 25 && wc <= 180) communication += 2.5;
    else if (wc > 10) communication += 1;
    const fillerCount = FILLERS.reduce((a, f) => a + countOccurrences(lower, f), 0);
    communication -= Math.min(fillerCount * 0.5, 2.5);
  }
  communication = clamp(communication, 0, 10);

  let confidence = wc === 0 ? 0 : 5.5;
  if (wc > 0) {
    const hedgeCount = HEDGES.reduce((a, h) => a + countOccurrences(lower, h), 0);
    const assertCount = ASSERTIVE.reduce((a, h) => a + countOccurrences(lower, h), 0);
    confidence += Math.min(assertCount * 0.8, 2.5) - Math.min(hedgeCount * 0.9, 3);
    if (wc < 8) confidence -= 2;
  }
  confidence = clamp(confidence, 0, 10);

  const overall = round1((correctness + communication + confidence) / 3);
  const feedback = buildFeedback(correctness, communication, confidence, wc);

  return {
    correctnessScore: round1(correctness),
    communicationScore: round1(communication),
    confidenceScore: round1(confidence),
    overallScore: overall,
    feedback,
  };
}

function buildFeedback(c, comm, conf, wc) {
  if (wc === 0) {
    return 'No answer was recorded for this question \u2014 in a real round, silence reads as unpreparedness.';
  }
  const notes = [];
  notes.push(
    c >= 7.5
      ? 'Technically solid \u2014 you covered the relevant ground clearly.'
      : c >= 5
      ? 'On the right track technically, but go one level deeper with specifics next time.'
      : 'The technical core of the answer needs more substance \u2014 anchor it in a concrete example.'
  );
  notes.push(
    comm >= 7.5
      ? 'Well structured and easy to follow.'
      : comm >= 5
      ? 'Understandable, but tightening the structure would help.'
      : 'Try organizing the answer into shorter, clearer sentences.'
  );
  notes.push(
    conf >= 7.5
      ? 'Delivered with confidence and ownership.'
      : conf >= 5
      ? "Reasonably confident \u2014 cut hedging phrases like 'I think' or 'maybe'."
      : "Speak with more ownership \u2014 lead with what you did, not what you're unsure about."
  );
  return notes.join(' ');
}

module.exports = {
  extractProfileHeuristic,
  generateQuestionsHeuristic,
  scoreAnswerHeuristic,
};

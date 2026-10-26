const crypto = require('crypto');
const { chatCompleteJSON, isConfigured } = require('../utils/openrouter');

const QUESTION_COUNT = 5;
const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const CATEGORIES = new Set(['Introduction', 'Resume', 'Projects', 'Technical', 'Behavioral', 'Experience', 'Problem Solving']);
const TYPES = new Set(['technical', 'behavioral', 'resume', 'experience', 'problem-solving']);

const QUESTION_SYSTEM_PROMPT = `You generate personalized mock interview questions from the candidate resume context.
Return ONLY a JSON array of exactly 5 objects. Each object must have:
{ "text": "string", "category": "Introduction|Resume|Projects|Technical|Behavioral|Experience|Problem Solving",
  "difficulty": "Easy|Medium|Hard", "type": "technical|behavioral|resume|experience|problem-solving",
  "timeLimit": 60|90|120 }
Every question must reference a concrete resume detail when one exists, such as a named skill,
project, technology, education item, certification, achievement, or experience responsibility.
Avoid generic questions that could apply to any candidate.`;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 502;
  error.code = 'INVALID_QUESTION_PAYLOAD';
  return error;
}

function normalizeQuestionText(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) return '';
  return typeof question.text === 'string' ? question.text.trim() : typeof question.question === 'string' ? question.question.trim() : '';
}

function validateQuestionSet(questions) {
  if (!Array.isArray(questions) || questions.length !== QUESTION_COUNT) {
    throw validationError(`Question generation must return exactly ${QUESTION_COUNT} questions`);
  }
  const seen = new Set();
  return questions.map((question, index) => {
    const text = normalizeQuestionText(question);
    const category = typeof question.category === 'string' ? question.category.trim() : '';
    const type = typeof question.type === 'string' ? question.type.trim().toLowerCase() : '';
    const difficulty = typeof question.difficulty === 'string'
      ? question.difficulty[0].toUpperCase() + question.difficulty.slice(1).toLowerCase()
      : '';
    const timeLimit = Number(question.timeLimit);
    const duplicateKey = text.toLowerCase();
    if (!text) throw validationError(`Question ${index + 1} is missing question text`);
    if (seen.has(duplicateKey)) throw validationError(`Question ${index + 1} is duplicated`);
    if (!CATEGORIES.has(category) || !TYPES.has(type) || !DIFFICULTIES.has(difficulty)) {
      throw validationError(`Question ${index + 1} has invalid category, type, or difficulty`);
    }
    if (!Number.isInteger(timeLimit) || ![60, 90, 120].includes(timeLimit)) {
      throw validationError(`Question ${index + 1} has an invalid time limit`);
    }
    seen.add(duplicateKey);
    return {
      questionId: crypto.randomUUID(),
      question: text,
      category,
      type,
      difficulty,
      timeLimit,
      order: index + 1,
    };
  });
}

function fallbackQuestions(resume, mode) {
  const skills = resume.profile.skills || [];
  const project = resume.profile.projects?.[0] || 'the project listed on your resume';
  const skillA = skills[0] || 'your primary technology';
  const skillB = skills[1] || skillA;
  const experience = resume.profile.experienceDetails?.[0] || 'your most relevant experience';
  const questions = mode === 'HR'
    ? [
      { text: `Give us a concise introduction using your experience with ${skillA} and ${project}.`, category: 'Introduction', type: 'resume', difficulty: 'Easy', timeLimit: 60 },
      { text: `What was your specific contribution to ${project}, and what result did it achieve?`, category: 'Projects', type: 'experience', difficulty: 'Easy', timeLimit: 60 },
      { text: `Tell us about a challenge in ${experience} and how you handled it.`, category: 'Experience', type: 'behavioral', difficulty: 'Medium', timeLimit: 90 },
      { text: `How did you collaborate with others while working on ${project}?`, category: 'Behavioral', type: 'behavioral', difficulty: 'Medium', timeLimit: 90 },
      { text: `If you revisited ${project} today, what would you improve and why?`, category: 'Problem Solving', type: 'problem-solving', difficulty: 'Hard', timeLimit: 120 },
    ]
    : [
      { text: `Explain the architecture or implementation of ${project}, including where you used ${skillA}.`, category: 'Projects', type: 'technical', difficulty: 'Easy', timeLimit: 60 },
      { text: `Why did you choose ${skillA} for ${project}, and what alternative did you consider?`, category: 'Technical', type: 'technical', difficulty: 'Easy', timeLimit: 60 },
      { text: `How did you use ${skillB} in ${project}, and what trade-offs did it introduce?`, category: 'Resume', type: 'resume', difficulty: 'Medium', timeLimit: 90 },
      { text: `Describe the most difficult technical problem in ${experience} and how you debugged it.`, category: 'Experience', type: 'problem-solving', difficulty: 'Medium', timeLimit: 90 },
      { text: `How would you scale or improve ${project} if its usage grew tenfold?`, category: 'Problem Solving', type: 'technical', difficulty: 'Hard', timeLimit: 120 },
    ];
  return validateQuestionSet(questions);
}

async function generateInterviewQuestions({ resume, mode }) {
  if (!resume || !resume.profile) throw new Error('A parsed resume is required');
  const profile = resume.profile;
  const context = [
    `Mode: ${mode}`,
    `Name: ${profile.name || 'not provided'}`,
    `Skills: ${(profile.skills || []).join(', ') || 'not provided'}`,
    `Education: ${(profile.education || []).join('; ') || 'not provided'}`,
    `Experience: ${(profile.experienceDetails || []).join('; ') || 'not provided'}`,
    `Projects: ${(profile.projects || []).join('; ') || 'not provided'}`,
    `Certifications: ${(profile.certifications || []).join('; ') || 'not provided'}`,
    `Achievements: ${(profile.achievements || []).join('; ') || 'not provided'}`,
    `Resume text excerpt: ${(resume.extractedText || '').slice(0, 6000)}`,
  ].join('\n');

  if (isConfigured()) {
    try {
      return validateQuestionSet(await chatCompleteJSON({
        system: QUESTION_SYSTEM_PROMPT,
        user: context,
        maxTokens: 1200,
      }));
    } catch (error) {
      if (error.code === 'INVALID_QUESTION_PAYLOAD' || error instanceof SyntaxError) throw error.code ? error : validationError('Question generation returned malformed JSON');
      console.warn('[interview] AI question generation unavailable, using resume-grounded fallback:', error.message);
    }
  }
  return fallbackQuestions(resume, mode);
}

module.exports = { generateInterviewQuestions, validateQuestionSet, QUESTION_COUNT };

const { chatCompleteJSON, isConfigured } = require('../utils/openrouter');
const { scoreAnswerHeuristic } = require('../utils/heuristics');

const GRADING_SYSTEM_PROMPT = `You are evaluating a mock interview answer against the actual question. Return ONLY a JSON object
(no markdown fences, no commentary) with this exact shape:
{
  "correctnessScore": 0-10,
  "relevanceScore": 0-10,
  "technicalDepthScore": 0-10,
  "communicationScore": 0-10,
  "confidenceScore": 0-10,
  "feedback": "2-3 sentences of specific, constructive feedback",
  "improvement": "one specific improvement",
  "strengths": ["specific strength"],
  "weaknesses": ["specific weakness"]
}`;

function validateScore(value, name) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    const error = new Error(`Evaluation returned an invalid ${name}`);
    error.statusCode = 502;
    throw error;
  }
  return Math.round(score * 10) / 10;
}

function normalizeText(value, name, required = false) {
  if (typeof value !== 'string') {
    if (required) {
      const error = new Error(`Evaluation returned an invalid ${name}`);
      error.statusCode = 502;
      throw error;
    }
    return '';
  }
  const normalized = value.trim();
  if (required && !normalized) {
    const error = new Error(`Evaluation returned an empty ${name}`);
    error.statusCode = 502;
    throw error;
  }
  return normalized;
}

function normalizeList(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    const error = new Error(`Evaluation returned an invalid ${name}`);
    error.statusCode = 502;
    throw error;
  }
  return value.map((item) => item.trim()).filter(Boolean).slice(0, 5);
}

function normalizeEvaluation(scores, source) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    const error = new Error('Evaluation returned an invalid payload');
    error.statusCode = 502;
    throw error;
  }

  const correctnessScore = validateScore(scores.correctnessScore, 'correctness score');
  const relevanceScore = validateScore(scores.relevanceScore ?? scores.correctnessScore, 'relevance score');
  const technicalDepthScore = validateScore(scores.technicalDepthScore ?? scores.correctnessScore, 'technical depth score');
  const communicationScore = validateScore(scores.communicationScore, 'communication score');
  const confidenceScore = validateScore(scores.confidenceScore, 'confidence score');
  const overallScore = Math.round(
    ((correctnessScore + relevanceScore + technicalDepthScore + communicationScore + confidenceScore) / 5) * 10
  ) / 10;

  return {
    correctnessScore,
    relevanceScore,
    technicalDepthScore,
    communicationScore,
    confidenceScore,
    overallScore,
    feedback: normalizeText(scores.feedback, 'feedback', true),
    improvement: normalizeText(scores.improvement, 'improvement'),
    strengths: normalizeList(scores.strengths, 'strengths'),
    weaknesses: normalizeList(scores.weaknesses, 'weaknesses'),
    evaluationSource: source,
    evaluatedAt: new Date(),
  };
}

async function evaluateAnswer({ question, answer, category, difficulty, resumeContext = '', skills = [] }) {
  if (isConfigured()) {
    try {
      const scores = await chatCompleteJSON({
        system: GRADING_SYSTEM_PROMPT,
        user: [
          `Question category: ${category || 'Not specified'}`,
          `Question difficulty: ${difficulty || 'Not specified'}`,
          `Question: ${question}`,
          `Candidate's answer: ${answer || '(no answer given)'}`,
          resumeContext ? `Relevant resume context: ${resumeContext}` : '',
        ].filter(Boolean).join('\n'),
      });
      return normalizeEvaluation(scores, 'ai');
    } catch (err) {
      console.warn('[interview] OpenRouter grading failed, falling back to heuristic:', err.message);
    }
  }

  const fallback = scoreAnswerHeuristic(question, answer, skills);
  return normalizeEvaluation({
    ...fallback,
    relevanceScore: fallback.correctnessScore,
    technicalDepthScore: fallback.correctnessScore,
    improvement: 'Add a specific example, decision, and measurable outcome to make the answer stronger.',
    strengths: fallback.correctnessScore >= 6 ? ['The answer addresses the interview question.'] : [],
    weaknesses: fallback.correctnessScore < 7 ? ['The answer needs more specific supporting detail.'] : [],
  }, 'fallback');
}

function calculateInterviewScores(interview) {
  interview.computeFinalScores();
  return interview;
}

module.exports = { evaluateAnswer, calculateInterviewScores, normalizeEvaluation };

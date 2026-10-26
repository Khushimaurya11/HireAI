const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const { generateInterviewQuestions } = require('./questionService');
const { evaluateAnswer } = require('./evaluationService');
const { finalizeInterview } = require('./resultService');
const { listUserInterviews } = require('./historyService');

const INTERVIEW_COST = Number(process.env.INTERVIEW_COST_CREDITS) || 50;

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicQuestion(question, questionNumber) {
  if (!question) return null;
  return {
    questionId: question.questionId,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty,
    timeLimit: question.timeLimit,
    questionNumber,
  };
}

function publicSession(interview) {
  const index = interview.currentQuestionIndex || 0;
  return {
    _id: interview._id,
    mode: interview.mode,
    role: interview.role,
    status: interview.status,
    totalQuestions: interview.questions.length,
    answeredQuestions: interview.questions.filter((question) => question.candidateAnswer?.trim()).length,
    currentQuestion: publicQuestion(interview.questions[index], index + 1),
  };
}

async function startInterview({ user, mode }) {
  if (!mode) throw serviceError('mode is required', 400);
  if (!['Technical', 'HR', 'Mixed'].includes(mode)) {
    throw serviceError('mode must be Technical, HR, or Mixed', 400);
  }
  if (user.credits < INTERVIEW_COST) {
    throw serviceError(`Not enough credits. This session costs ${INTERVIEW_COST}.`, 402);
  }

  const resume = await Resume.findOne({ userId: user._id, isActive: true });
  if (!resume) throw serviceError('Upload and parse a resume before starting an interview', 422);
  const questions = await generateInterviewQuestions({ resume, mode });
  user.deductCredits(INTERVIEW_COST);
  await user.save();

  const interview = await Interview.create({
    userId: user._id,
    resumeId: resume._id,
    role: resume.profile.role || 'Resume candidate',
    experience: resume.profile.experience || 'Not specified',
    skills: resume.profile.skills || [],
    projects: resume.profile.projects || [],
    mode,
    questions,
    status: 'Incomplete',
  });

  return { interview: publicSession(interview), walletBalance: user.credits };
}

async function findOwnedInterview({ interviewId, userId }) {
  let interview;
  try {
    interview = await Interview.findOne({ _id: interviewId, userId });
  } catch (error) {
    if (error.name === 'CastError') throw serviceError('Interview not found', 404);
    throw error;
  }
  if (!interview) throw serviceError('Interview not found', 404);
  return interview;
}

async function submitAnswer({ interviewId, userId, questionId, questionIndex, answer }) {
  const interview = await findOwnedInterview({ interviewId, userId });
  if (interview.status === 'Completed') {
    throw serviceError('Interview already completed', 400);
  }

  if (typeof answer !== 'string') {
    throw serviceError('answer must be a string', 400);
  }
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) throw serviceError('answer cannot be empty', 400);
  if (trimmedAnswer.length > 10000) throw serviceError('answer is too long', 400);

  const currentIndex = interview.currentQuestionIndex || 0;
  if (questionIndex !== currentIndex) throw serviceError('You must answer the current question before continuing', 409);
  if (typeof questionId !== 'string' || questionId.trim() !== interview.questions[currentIndex]?.questionId) {
    throw serviceError('questionId does not match the current question', 400);
  }
  const question = interview.questions[currentIndex];
  if (!question) throw serviceError('No current question is available', 409);
  if (question.candidateAnswer?.trim()) throw serviceError('This question has already been answered', 409);

  const resume = interview.resumeId
    ? await Resume.findById(interview.resumeId).select('profile extractedText')
    : null;
  const resumeContext = resume
    ? [
      resume.profile?.summary,
      ...(resume.profile?.skills || []),
      ...(resume.profile?.projects || []),
    ].filter(Boolean).join('; ')
    : '';
  const scores = await evaluateAnswer({
    question: question.question,
    answer: trimmedAnswer,
    category: question.category,
    difficulty: question.difficulty,
    resumeContext,
    skills: interview.skills,
  });

  question.candidateAnswer = trimmedAnswer;
  question.submittedAt = new Date();
  question.correctnessScore = scores.correctnessScore;
  question.communicationScore = scores.communicationScore;
  question.confidenceScore = scores.confidenceScore;
  question.overallScore = scores.overallScore;
  question.feedback = scores.feedback;
  question.improvement = scores.improvement;
  question.strengths = scores.strengths;
  question.weaknesses = scores.weaknesses;
  question.relevanceScore = scores.relevanceScore;
  question.technicalDepthScore = scores.technicalDepthScore;
  question.evaluationSource = scores.evaluationSource;
  question.evaluatedAt = scores.evaluatedAt;

  interview.currentQuestionIndex = currentIndex + 1;
  await interview.save();
  const nextQuestion = interview.questions[interview.currentQuestionIndex];
  return {
    success: true,
    answered: true,
    answeredQuestion: publicQuestion(question, currentIndex + 1),
    nextQuestion: publicQuestion(nextQuestion, interview.currentQuestionIndex + 1),
    totalQuestions: interview.questions.length,
    completed: !nextQuestion,
  };
}

async function getCurrentQuestion({ interviewId, userId }) {
  const interview = await findOwnedInterview({ interviewId, userId });
  if (interview.status === 'Completed') throw serviceError('Interview already completed', 409);
  const index = interview.currentQuestionIndex || 0;
  return {
    interviewId: interview._id,
    mode: interview.mode,
    totalQuestions: interview.questions.length,
    currentQuestion: publicQuestion(interview.questions[index], index + 1),
  };
}

async function completeInterview({ interviewId, userId }) {
  const interview = await findOwnedInterview({ interviewId, userId });
  const unanswered = interview.questions.find((question) => !question.candidateAnswer?.trim());
  if (unanswered) throw serviceError('Answer every question before completing the interview', 400);
  return { interview: await finalizeInterview(interview) };
}

function listInterviews({ userId }) {
  return listUserInterviews({ userId });
}

function getInterview({ interviewId, userId }) {
  return findOwnedInterview({ interviewId, userId }).then(publicSession);
}

module.exports = {
  startInterview,
  submitAnswer,
  completeInterview,
  listInterviews,
  getInterview,
  getCurrentQuestion,
};

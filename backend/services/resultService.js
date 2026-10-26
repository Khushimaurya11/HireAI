const Interview = require('../models/Interview');

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAnswerCounts(interview) {
  const questions = Array.isArray(interview.questions) ? interview.questions : [];
  const answeredQuestions = questions.filter((question) => typeof question.candidateAnswer === 'string' && question.candidateAnswer.trim()).length;
  const evaluatedQuestions = questions.filter((question) => Number.isFinite(question.overallScore)).length;

  return {
    totalQuestions: questions.length,
    answeredQuestions,
    evaluatedQuestions,
  };
}

function aggregateScores(interview) {
  const evaluated = (interview.questions || []).filter((question) => (
    Number.isFinite(question.correctnessScore)
    && Number.isFinite(question.communicationScore)
    && Number.isFinite(question.confidenceScore)
  ));

  if (!evaluated.length) {
    return {
      overallScore: null,
      avgCorrectness: null,
      avgRelevance: null,
      avgTechnicalDepth: null,
      avgCommunication: null,
      avgConfidence: null,
    };
  }

  const average = (field, fallbackField = null) => Math.round(
    evaluated.reduce((total, question) => total + (Number.isFinite(question[field])
      ? question[field]
      : (fallbackField ? question[fallbackField] : 0)), 0) / evaluated.length * 10
  ) / 10;
  const avgCorrectness = average('correctnessScore');
  const avgRelevance = average('relevanceScore', 'correctnessScore');
  const avgTechnicalDepth = average('technicalDepthScore', 'correctnessScore');
  const avgCommunication = average('communicationScore');
  const avgConfidence = average('confidenceScore');
  const overallScore = average('overallScore', 'correctnessScore');

  return {
    overallScore,
    avgCorrectness,
    avgRelevance,
    avgTechnicalDepth,
    avgCommunication,
    avgConfidence,
  };
}

function buildResult(interview) {
  const counts = getAnswerCounts(interview);
  const scores = aggregateScores(interview);
  const strengths = [...new Set((interview.questions || []).flatMap((question) => question.strengths || []))];
  const weaknesses = [...new Set((interview.questions || []).flatMap((question) => question.weaknesses || []))];
  const improvements = [...new Set((interview.questions || []).map((question) => question.improvement).filter(Boolean))];

  return {
    interviewId: interview._id,
    mode: interview.mode,
    createdAt: interview.createdAt,
    status: interview.status,
    ...counts,
    ...scores,
    strengths,
    weaknesses,
    improvements,
    questionResults: (interview.questions || []).map((question, index) => ({
      questionIndex: index,
      questionId: question.questionId,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      answer: question.candidateAnswer || '',
      feedback: question.feedback || '',
      improvement: question.improvement || '',
      strengths: question.strengths || [],
      weaknesses: question.weaknesses || [],
      evaluationSource: question.evaluationSource || null,
      evaluatedAt: question.evaluatedAt || null,
      overallScore: Number.isFinite(question.overallScore) ? question.overallScore : null,
      evaluated: Number.isFinite(question.overallScore),
    })),
    summary: counts.evaluatedQuestions
      ? 'Result calculated from evaluated answers.'
      : 'No evaluated answers are available yet.',
    completedAt: interview.status === 'Completed' ? interview.updatedAt : null,
  };
}

async function findCompletedInterview({ interviewId, userId }) {
  let interview;
  try {
    interview = await Interview.findOne({ _id: interviewId, userId });
  } catch (error) {
    if (error.name === 'CastError') throw serviceError('Interview not found', 404);
    throw error;
  }
  if (!interview) throw serviceError('Interview not found', 404);
  if (interview.status !== 'Completed') throw serviceError('Interview is not completed', 409);
  return interview;
}

async function finalizeInterview(interview) {
  const result = buildResult(interview);
  if (result.evaluatedQuestions === 0) {
    throw serviceError('Submit at least one evaluated answer before completing the interview', 400);
  }

  interview.avgCorrectness = result.avgCorrectness;
  interview.avgRelevance = result.avgRelevance;
  interview.avgTechnicalDepth = result.avgTechnicalDepth;
  interview.avgCommunication = result.avgCommunication;
  interview.avgConfidence = result.avgConfidence;
  interview.finalScore = result.overallScore;
  interview.status = 'Completed';
  await interview.save();
  return interview;
}

async function getInterviewResult({ interviewId, userId }) {
  const interview = await findCompletedInterview({ interviewId, userId });
  return buildResult(interview);
}

module.exports = {
  aggregateScores,
  buildResult,
  finalizeInterview,
  findCompletedInterview,
  getInterviewResult,
};

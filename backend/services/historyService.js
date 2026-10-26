const Interview = require('../models/Interview');

async function listUserInterviews({ userId }) {
  const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });
  return interviews.map((interview) => ({
    _id: interview._id,
    mode: interview.mode,
    status: interview.status,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    finalScore: interview.finalScore,
    avgCommunication: interview.avgCommunication,
    avgCorrectness: interview.avgCorrectness,
    avgConfidence: interview.avgConfidence,
    totalQuestions: interview.questions.length,
    answeredQuestions: interview.questions.filter((question) => question.candidateAnswer?.trim()).length,
  }));
}

async function listCompletedInterviews({ userId }) {
  return Interview.find({ userId, status: 'Completed' }).sort({ createdAt: -1 });
}

async function listHistory({ userId }) {
  const interviews = await Interview.find({ userId, status: 'Completed' })
    .sort({ createdAt: -1 })
    .select('_id mode status createdAt updatedAt finalScore questions');

  return interviews.map((interview) => ({
    id: interview._id,
    mode: interview.mode,
    status: interview.status,
    createdAt: interview.createdAt,
    completedAt: interview.updatedAt,
    score: interview.finalScore,
    totalQuestions: interview.questions.length,
    answeredQuestions: interview.questions.filter((question) => question.candidateAnswer?.trim()).length,
    evaluatedQuestions: interview.questions.filter((question) => Number.isFinite(question.overallScore)).length,
  }));
}

module.exports = { listUserInterviews, listCompletedInterviews, listHistory };

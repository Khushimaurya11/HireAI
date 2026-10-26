const interviewService = require('../services/interviewService');
const { getInterviewResult } = require('../services/resultService');
const { listHistory } = require('../services/historyService');

function sendError(res, error, fallbackMessage) {
  console.error(`[interview] ${fallbackMessage}:`, error.message);
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : fallbackMessage,
  });
}

async function startInterview(req, res) {
  try {
    const result = await interviewService.startInterview({
      user: req.user,
      mode: req.body.mode,
    });
    return res.status(201).json(result);
  } catch (error) {
    return sendError(res, error, 'Failed to start interview');
  }
}

async function submitAnswer(req, res) {
  try {
    const result = await interviewService.submitAnswer({
      interviewId: req.params.id,
      userId: req.user._id,
      questionId: req.body.questionId,
      questionIndex: req.body.questionIndex,
      answer: req.body.answer,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Failed to score answer');
  }
}

async function completeInterview(req, res) {
  try {
    const result = await interviewService.completeInterview({
      interviewId: req.params.id,
      userId: req.user._id,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Failed to complete interview');
  }
}

async function listInterviews(req, res) {
  try {
    const interviews = await interviewService.listInterviews({ userId: req.user._id });
    return res.json({ interviews });
  } catch (error) {
    return sendError(res, error, 'Failed to list interviews');
  }
}

async function getInterview(req, res) {
  try {
    const interview = await interviewService.getInterview({
      interviewId: req.params.id,
      userId: req.user._id,
    });
    return res.json({ interview });
  } catch (error) {
    return sendError(res, error, 'Failed to get interview');
  }
}

async function currentQuestion(req, res) {
  try {
    const result = await interviewService.getCurrentQuestion({
      interviewId: req.params.id,
      userId: req.user._id,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, 'Failed to get current question');
  }
}

async function getResult(req, res) {
  try {
    const result = await getInterviewResult({
      interviewId: req.params.id,
      userId: req.user._id,
    });
    return res.json({ result });
  } catch (error) {
    return sendError(res, error, 'Failed to get interview result');
  }
}

async function getHistory(req, res) {
  try {
    return res.json({ history: await listHistory({ userId: req.user._id }) });
  } catch (error) {
    return sendError(res, error, 'Failed to load interview history');
  }
}

module.exports = { startInterview, submitAnswer, completeInterview, listInterviews, getInterview, getResult, getHistory, currentQuestion };

const express = require('express');
const { isAuth } = require('../middleware/auth');
const {
  startInterview,
  submitAnswer,
  completeInterview,
  listInterviews,
  getInterview,
  getResult,
  getHistory,
  currentQuestion,
} = require('../controllers/interviewController');

const router = express.Router();

router.post('/start', isAuth, startInterview);
router.post('/:id/answer', isAuth, submitAnswer);
router.post('/:id/complete', isAuth, completeInterview);
router.get('/:id/current', isAuth, currentQuestion);
router.get('/', isAuth, listInterviews);
router.get('/history', isAuth, getHistory);
router.get('/:id/result', isAuth, getResult);
router.get('/:id', isAuth, getInterview);

module.exports = router;

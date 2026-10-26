const express = require('express');
const { isAuth } = require('../middleware/auth');
const { getRecommendations } = require('../controllers/learningController');

const router = express.Router();

router.get('/recommendations', isAuth, getRecommendations);

module.exports = router;

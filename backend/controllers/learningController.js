const learningService = require('../services/learningService');

async function getRecommendations(req, res) {
  try {
    const result = await learningService.getRecommendations({ userId: req.user._id });
    return res.json(result);
  } catch (error) {
    console.error('[learning] getRecommendations error:', error.message);
    return res.status(500).json({ error: 'Failed to load learning recommendations' });
  }
}

module.exports = { getRecommendations };

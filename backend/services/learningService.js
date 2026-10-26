const Interview = require('../models/Interview');

const WEAK_SCORE_THRESHOLD = 6;
const RECENT_INTERVIEW_LIMIT = 10;

function normalizeTopic(topic) {
  return topic.trim().replace(/\s+/g, ' ');
}

function topicFromQuestion(question, skills, mode) {
  const text = String(question || '').toLowerCase();
  const matchedSkill = skills.find((skill) => text.includes(String(skill).toLowerCase()));
  if (matchedSkill) return normalizeTopic(matchedSkill);
  return mode === 'HR' ? 'Behavioral communication' : 'Technical explanation';
}

function addGap(gaps, topic, score, reason, source) {
  const key = topic.toLowerCase();
  const existing = gaps.get(key);
  if (existing) {
    existing.occurrences += 1;
    existing.scores.push(score);
    existing.reasons.add(reason);
    existing.sources.add(source);
    return;
  }
  gaps.set(key, {
    topic,
    scores: [score],
    occurrences: 1,
    reasons: new Set([reason]),
    sources: new Set([source]),
  });
}

function priorityFor(gap) {
  const average = gap.scores.reduce((sum, score) => sum + score, 0) / gap.scores.length;
  if (gap.occurrences >= 2 || average < 4.5) return 'high';
  if (average < 5.5) return 'medium';
  return 'low';
}

function recommendationFor(topic, kind) {
  if (kind === 'communication') {
    return `Practice concise, structured answers that make your actions and impact easy to follow.`;
  }
  if (kind === 'confidence') {
    return `Rehearse ownership language and concrete examples so your delivery sounds more decisive.`;
  }
  if (kind === 'depth') {
    return `Practice explaining the trade-offs, implementation details, and measurable impact behind your answer.`;
  }
  if (kind === 'relevance') {
    return `Answer the exact question first, then support it with one focused example from your experience.`;
  }
  if (topic === 'Technical explanation') {
    return `Review core concepts and explain one relevant design or debugging decision out loud.`;
  }
  if (topic === 'Behavioral communication') {
    return `Practice a STAR response for teamwork, conflict, and motivation questions.`;
  }
  return `Review ${topic} and prepare one project example that explains your decisions and measurable impact.`;
}

function buildRecommendations(interviews) {
  const gaps = new Map();

  interviews.forEach((interview) => {
    const skills = Array.isArray(interview.skills) ? interview.skills : [];
    const questions = Array.isArray(interview.questions) ? interview.questions : [];

    questions.forEach((question) => {
      if (!Number.isFinite(question.overallScore) || question.overallScore >= WEAK_SCORE_THRESHOLD) return;
      const topic = topicFromQuestion(question.question, skills, interview.mode);
      addGap(
        gaps,
        topic,
        question.overallScore,
        `Average question score was ${question.overallScore}/10.`,
        `interview:${interview._id}`
      );
      if (Number.isFinite(question.technicalDepthScore) && question.technicalDepthScore < WEAK_SCORE_THRESHOLD) {
        addGap(gaps, 'Technical depth', question.technicalDepthScore, `Technical depth averaged ${question.technicalDepthScore}/10.`, `interview:${interview._id}`);
      }
      if (Number.isFinite(question.relevanceScore) && question.relevanceScore < WEAK_SCORE_THRESHOLD) {
        addGap(gaps, 'Answer relevance', question.relevanceScore, `Relevance averaged ${question.relevanceScore}/10.`, `interview:${interview._id}`);
      }
      (question.weaknesses || []).forEach((weakness) => {
        if (typeof weakness === 'string' && weakness.trim() && Number.isFinite(question.overallScore)) {
          addGap(gaps, weakness.trim(), question.overallScore, `This weakness was repeated in evaluated feedback.`, `interview:${interview._id}`);
        }
      });
    });

    if (Number.isFinite(interview.avgCommunication) && interview.avgCommunication < WEAK_SCORE_THRESHOLD) {
      addGap(gaps, 'Communication', interview.avgCommunication, `Communication averaged ${interview.avgCommunication}/10.`, `interview:${interview._id}`);
    }
    if (Number.isFinite(interview.avgConfidence) && interview.avgConfidence < WEAK_SCORE_THRESHOLD) {
      addGap(gaps, 'Confidence', interview.avgConfidence, `Confidence averaged ${interview.avgConfidence}/10.`, `interview:${interview._id}`);
    }
  });

  return [...gaps.values()]
    .map((gap) => {
      const averageScore = Math.round(gap.scores.reduce((sum, score) => sum + score, 0) / gap.scores.length * 10) / 10;
      const kind = gap.topic === 'Communication'
        ? 'communication'
        : gap.topic === 'Confidence'
          ? 'confidence'
          : gap.topic === 'Technical depth'
            ? 'depth'
            : gap.topic === 'Answer relevance'
              ? 'relevance'
              : 'technical';
      return {
        topic: gap.topic,
        reason: [...gap.reasons].join(' '),
        priority: priorityFor(gap),
        source: [...gap.sources],
        recommendation: recommendationFor(gap.topic, kind),
        averageScore,
        occurrences: gap.occurrences,
      };
    })
    .sort((left, right) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[left.priority] - priority[right.priority] || left.averageScore - right.averageScore;
    });
}

async function getRecommendations({ userId }) {
  const interviews = await Interview.find({
    userId,
    status: 'Completed',
  }).sort({ createdAt: -1 }).limit(RECENT_INTERVIEW_LIMIT);

  return {
    recommendations: buildRecommendations(interviews),
    analyzedInterviews: interviews.length,
    scoreThreshold: WEAK_SCORE_THRESHOLD,
  };
}

module.exports = {
  WEAK_SCORE_THRESHOLD,
  buildRecommendations,
  getRecommendations,
};

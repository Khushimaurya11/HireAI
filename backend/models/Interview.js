const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: Number, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    timeLimit: { type: Number, required: true }, // seconds
    candidateAnswer: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    feedback: { type: String, default: '' },
    improvement: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    correctnessScore: { type: Number, default: null },
    relevanceScore: { type: Number, default: null },
    technicalDepthScore: { type: Number, default: null },
    communicationScore: { type: Number, default: null },
    confidenceScore: { type: Number, default: null },
    overallScore: { type: Number, default: null },
    evaluationSource: { type: String, enum: ['ai', 'fallback', null], default: null },
    evaluatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    role: { type: String, required: true },
    experience: { type: String, default: 'Fresher / 0-1 yrs' },
    skills: [{ type: String }],
    projects: [{ type: String }],
    mode: { type: String, enum: ['HR', 'Technical', 'Mixed'], required: true },
    questions: [questionSchema],
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    finalScore: { type: Number, default: null },
    avgCorrectness: { type: Number, default: null },
    avgRelevance: { type: Number, default: null },
    avgTechnicalDepth: { type: Number, default: null },
    avgCommunication: { type: Number, default: null },
    avgConfidence: { type: Number, default: null },
    status: { type: String, enum: ['Incomplete', 'Completed'], default: 'Incomplete' },
  },
  { timestamps: true }
);

interviewSchema.methods.computeFinalScores = function () {
  const scored = this.questions.filter((q) => q.overallScore !== null);
  if (!scored.length) return;
  const avg = (key) => scored.reduce((a, q) => a + q[key], 0) / scored.length;
  this.avgCorrectness = Math.round(avg('correctnessScore') * 10) / 10;
  this.avgRelevance = Math.round(avg('relevanceScore') * 10) / 10;
  this.avgTechnicalDepth = Math.round(avg('technicalDepthScore') * 10) / 10;
  this.avgCommunication = Math.round(avg('communicationScore') * 10) / 10;
  this.avgConfidence = Math.round(avg('confidenceScore') * 10) / 10;
  this.finalScore = Math.round(avg('overallScore') * 10) / 10;
};

module.exports = mongoose.model('Interview', interviewSchema);

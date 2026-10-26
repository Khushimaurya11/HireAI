require('dotenv').config();

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const { validateQuestionSet } = require('../services/questionService');
const { normalizeEvaluation } = require('../services/evaluationService');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const users = [
  { name: 'Auth Test A', email: `auth-test-a-${suffix}@example.com`, password: 'test-password-a' },
  { name: 'Auth Test B', email: `auth-test-b-${suffix}@example.com`, password: 'test-password-b' },
];

function cookieFrom(response) {
  const value = response.headers.get('set-cookie') || '';
  return value.split(';', 1)[0];
}

async function request(path, options = {}, cookie = '') {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(isForm ? {} : { 'content-type': 'application/json' }), ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body, cookie: cookieFrom(response) || cookie };
}

function pdfBuffer(text) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(12).text(text);
    doc.end();
  });
}

before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({ email: { $in: users.map((user) => user.email) } });
});

after(async () => {
  const testUsers = await User.find({ email: { $in: users.map((user) => user.email) } }).select('_id');
  await Resume.deleteMany({ userId: { $in: testUsers.map((user) => user._id) } });
  await Interview.deleteMany({ userId: { $in: testUsers.map((user) => user._id) } });
  await User.deleteMany({ email: { $in: users.map((user) => user.email) } });
  await mongoose.disconnect();
});

test('registration validates input, creates a session, and rejects duplicates', async () => {
  const invalid = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: users[0].name, email: users[0].email, password: 'short' }),
  });
  assert.equal(invalid.response.status, 400);

  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(users[0]),
  });
  assert.equal(registered.response.status, 200);
  assert.ok(registered.cookie.startsWith('token='));
  assert.equal(registered.body.user.email, users[0].email);
  assert.equal(registered.body.user.passwordHash, undefined);

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(users[0]),
  });
  assert.equal(duplicate.response.status, 409);
});

test('login authenticates valid credentials and rejects invalid credentials', async () => {
  const invalid = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[0].email, password: 'wrong-password' }),
  });
  assert.equal(invalid.response.status, 401);

  const loggedIn = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[0].email, password: users[0].password }),
  });
  assert.equal(loggedIn.response.status, 200);
  assert.ok(loggedIn.cookie.startsWith('token='));
});

test('protected identity, profile ownership, protected fields, logout, and expiry use real sessions', async () => {
  const userA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[0].email, password: users[0].password }),
  });

  const userB = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(users[1]),
  });

  const missing = await request('/api/auth/me');
  assert.equal(missing.response.status, 401);

  const identity = await request('/api/auth/me', {}, userA.cookie);
  assert.equal(identity.response.status, 200);
  assert.equal(identity.body.user.email, users[0].email);

  const updated = await request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Updated Auth A', userId: userB.body.user.id, credits: 999999 }),
  }, userA.cookie);
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.user.name, 'Updated Auth A');
  assert.equal(updated.body.user.credits, 100);
  assert.equal(updated.body.user.passwordHash, undefined);

  const bIdentity = await request('/api/auth/me', {}, userB.cookie);
  assert.equal(bIdentity.body.user.name, users[1].name);

  const bUpdate = await request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Updated Auth B', userId: identity.body.user.id }),
  }, userB.cookie);
  assert.equal(bUpdate.response.status, 200);
  assert.equal(bUpdate.body.user.name, 'Updated Auth B');
  const aAfterBUpdate = await request('/api/auth/me', {}, userA.cookie);
  assert.equal(aAfterBUpdate.body.user.name, 'Updated Auth A');

  const invalidToken = await request('/api/auth/me', {}, 'token=not-a-jwt');
  assert.equal(invalidToken.response.status, 401);

  const expiredToken = jwt.sign({ id: identity.body.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
  const expired = await request('/api/auth/me', {}, `token=${expiredToken}`);
  assert.equal(expired.response.status, 401);

  const loggedOut = await request('/api/auth/logout', { method: 'POST' }, userA.cookie);
  assert.equal(loggedOut.response.status, 200);
  const afterLogout = await request('/api/auth/me', {}, cookieFrom(loggedOut.response));
  assert.equal(afterLogout.response.status, 401);
});

test('resume upload, parsing, retrieval, replacement, and ownership use real authentication', async () => {
  const userA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[0].email, password: users[0].password }),
  });

  const userB = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[1].email, password: users[1].password }),
  });

  const unauthenticated = new FormData();
  unauthenticated.append('resume', new Blob([await pdfBuffer('Jane Doe jane@example.com JavaScript Education Projects')], { type: 'application/pdf' }), 'resume.pdf');
  const unauthUpload = await request('/api/resume/upload', { method: 'POST', body: unauthenticated });
  assert.equal(unauthUpload.response.status, 401);

  const invalid = new FormData();
  invalid.append('resume', new Blob(['not a pdf'], { type: 'text/plain' }), 'resume.txt');
  const invalidUpload = await request('/api/resume/upload', { method: 'POST', body: invalid }, userA.cookie);
  assert.equal(invalidUpload.response.status, 415);

  const corrupted = new FormData();
  corrupted.append('resume', new Blob(['%PDF-1.4 corrupted'], { type: 'application/pdf' }), 'corrupted.pdf');
  const corruptedUpload = await request('/api/resume/upload', { method: 'POST', body: corrupted }, userA.cookie);
  assert.equal(corruptedUpload.response.status, 422);

  const form = new FormData();
  form.append('resume', new Blob([await pdfBuffer('Jane Doe jane@example.com +1 555 123 4567 Skills JavaScript Education University Projects HireAI')], { type: 'application/pdf' }), 'candidate.pdf');
  const uploaded = await request('/api/resume/upload', { method: 'POST', body: form }, userA.cookie);
  assert.equal(uploaded.response.status, 200);
  assert.equal(uploaded.body.success, true);
  assert.equal(uploaded.body.profile.email, 'jane@example.com');
  assert.ok(uploaded.body.metadata.textLength > 0);

  const listed = await request('/api/resume', {}, userA.cookie);
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.resumes.length, 1);
  assert.equal(listed.body.resumes[0].extractedText, undefined);

  const retrieved = await request(`/api/resume/${uploaded.body.resumeId}`, {}, userA.cookie);
  assert.equal(retrieved.response.status, 200);
  assert.match(retrieved.body.resume.extractedText, /Jane Doe/);

  const forbidden = await request(`/api/resume/${uploaded.body.resumeId}`, {}, userB.cookie);
  assert.equal(forbidden.response.status, 404);

  const replacement = new FormData();
  replacement.append('resume', new Blob([await pdfBuffer('Jane Doe jane@example.com Skills Python')], { type: 'application/pdf' }), 'updated.pdf');
  const replaced = await request('/api/resume/upload', { method: 'POST', body: replacement }, userA.cookie);
  assert.equal(replaced.response.status, 200);
  assert.equal(String(replaced.body.resumeId), String(uploaded.body.resumeId));
});

test('interview generation uses the authenticated active resume and persists question IDs', async () => {
  const userA = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[0].email, password: users[0].password }),
  });
  const noResumeUser = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: users[1].email, password: users[1].password }),
  });

  const noResume = await request('/api/interview/start', {
    method: 'POST',
    body: JSON.stringify({ mode: 'Technical', role: 'Should be ignored', skills: ['FakeSkill'] }),
  }, noResumeUser.cookie);
  assert.equal(noResume.response.status, 422);

  const testUser = await User.findOne({ email: users[0].email });
  await Resume.updateMany({ userId: testUser._id, isActive: true }, { $set: { isActive: false } });
  const resume = await Resume.create({
    userId: testUser._id,
    filename: 'auth-resume.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    textLength: 100,
    extractedText: 'Jane Doe built an LMS with React, Node.js, Express and MongoDB.',
    profile: {
      name: 'Jane Doe',
      skills: ['React', 'Node.js', 'Express', 'MongoDB'],
      projects: ['LMS platform'],
      experienceDetails: ['Built an LMS platform'],
      education: [],
      certifications: [],
      achievements: [],
    },
    isActive: true,
  });

  const started = await request('/api/interview/start', {
    method: 'POST',
    body: JSON.stringify({ mode: 'Technical', role: 'Fake role', skills: ['FakeSkill'] }),
  }, userA.cookie);
  assert.equal(started.response.status, 201);
  assert.equal(started.body.interview.totalQuestions, 5);
  assert.equal(started.body.interview.answeredQuestions, 0);
  assert.ok(started.body.interview.currentQuestion.questionId);
  assert.ok(/React|Node\.js|Express|MongoDB|LMS/i.test(started.body.interview.currentQuestion.question));
  assert.equal(Object.prototype.hasOwnProperty.call(started.body.interview, 'questions'), false);
  const stored = await Interview.findById(started.body.interview._id);
  assert.equal(String(stored.resumeId), String(resume._id));
  let currentQuestion = started.body.interview.currentQuestion;
  const current = await request(`/api/interview/${started.body.interview._id}/current`, {}, userA.cookie);
  assert.equal(current.response.status, 200);
  assert.equal(current.body.currentQuestion.questionId, currentQuestion.questionId);
  const skippedQuestion = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 1, answer: 'Attempted to skip ahead.' }),
  }, userA.cookie);
  assert.equal(skippedQuestion.response.status, 409);

  const emptyAnswer = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 0, answer: '   ' }),
  }, userA.cookie);
  assert.equal(emptyAnswer.response.status, 400);

  const invalidQuestion = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: 'missing-question', questionIndex: 0, answer: 'This should be rejected.' }),
  }, userA.cookie);
  assert.equal(invalidQuestion.response.status, 400);

  const invalidInterview = await request('/api/interview/not-an-object-id/answer', {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 0, answer: 'This should be rejected.' }),
  }, userA.cookie);
  assert.equal(invalidInterview.response.status, 404);

  const unauthenticated = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 0, answer: 'This should be rejected.' }),
  });
  assert.equal(unauthenticated.response.status, 401);

  const anotherUser = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 0, answer: 'User B must not access this.' }),
  }, noResumeUser.cookie);
  assert.equal(anotherUser.response.status, 404);

  const firstAnswer = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: 0, answer: 'I designed the LMS architecture with React and Node.js.' }),
  }, userA.cookie);
  assert.equal(firstAnswer.response.status, 200);
  assert.equal(firstAnswer.body.answered, true);
  assert.equal(firstAnswer.body.completed, false);
  assert.ok(firstAnswer.body.nextQuestion.questionId);
  assert.equal(Object.prototype.hasOwnProperty.call(firstAnswer.body, 'question'), false);
  currentQuestion = firstAnswer.body.nextQuestion;

  const duplicateAnswer = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: firstAnswer.body.answeredQuestion.questionId, questionIndex: 0, answer: 'Updated answer with more implementation detail.' }),
  }, userA.cookie);
  assert.equal(duplicateAnswer.response.status, 409);
  const updatedInterview = await Interview.findById(started.body.interview._id);
  assert.equal(updatedInterview.questions[0].candidateAnswer, 'I designed the LMS architecture with React and Node.js.');

  const prematureCompletion = await request(`/api/interview/${started.body.interview._id}/complete`, { method: 'POST' }, userA.cookie);
  assert.equal(prematureCompletion.response.status, 400);
  const incompleteResult = await request(`/api/interview/${started.body.interview._id}/result`, {}, userA.cookie);
  assert.equal(incompleteResult.response.status, 409);

  while (currentQuestion) {
    const answer = await request(`/api/interview/${started.body.interview._id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId: currentQuestion.questionId, questionIndex: currentQuestion.questionNumber - 1, answer: `Answer for ${currentQuestion.questionId} with concrete project details.` }),
    }, userA.cookie);
    assert.equal(answer.response.status, 200);
    currentQuestion = answer.body.nextQuestion;
  }

  const completed = await request(`/api/interview/${started.body.interview._id}/complete`, { method: 'POST' }, userA.cookie);
  assert.equal(completed.response.status, 200);
  assert.equal(completed.body.interview.status, 'Completed');

  const result = await request(`/api/interview/${started.body.interview._id}/result`, {}, userA.cookie);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.result.totalQuestions, 5);
  assert.equal(result.body.result.answeredQuestions, 5);
  assert.equal(result.body.result.evaluatedQuestions, 5);
  assert.equal(result.body.result.questionResults[0].questionId, stored.questions[0].questionId);
  assert.ok(Number.isFinite(result.body.result.overallScore));

  const history = await request('/api/interview/history', {}, userA.cookie);
  assert.equal(history.response.status, 200);
  assert.equal(history.body.history.length, 1);
  assert.equal(history.body.history[0].id, started.body.interview._id);
  assert.equal(history.body.history[0].status, 'Completed');

  const otherUserHistory = await request('/api/interview/history', {}, noResumeUser.cookie);
  assert.equal(otherUserHistory.response.status, 200);
  assert.equal(otherUserHistory.body.history.length, 0);

  const learning = await request('/api/learning/recommendations', {}, userA.cookie);
  assert.equal(learning.response.status, 200);
  assert.equal(learning.body.analyzedInterviews, 1);

  const otherUserResult = await request(`/api/interview/${started.body.interview._id}/result`, {}, noResumeUser.cookie);
  assert.equal(otherUserResult.response.status, 404);
  const unauthenticatedResult = await request(`/api/interview/${started.body.interview._id}/result`);
  assert.equal(unauthenticatedResult.response.status, 401);

  const afterCompletion = await request(`/api/interview/${started.body.interview._id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId: 'current-question', questionIndex: 0, answer: 'Too late.' }),
  }, userA.cookie);
  assert.equal(afterCompletion.response.status, 400);

  assert.throws(() => normalizeEvaluation({ correctnessScore: 11, communicationScore: 5, confidenceScore: 5, feedback: 'bad' }, 'ai'), /invalid correctness score/);
  assert.throws(() => normalizeEvaluation({ correctnessScore: 5, communicationScore: 5, confidenceScore: 5 }, 'ai'), /invalid feedback/);

  assert.throws(() => validateQuestionSet([
    { text: 'Duplicate?', category: 'Technical', type: 'technical', difficulty: 'Easy', timeLimit: 60 },
    { text: 'Duplicate?', category: 'Technical', type: 'technical', difficulty: 'Easy', timeLimit: 60 },
    { text: 'Three', category: 'Technical', type: 'technical', difficulty: 'Easy', timeLimit: 60 },
    { text: 'Four', category: 'Technical', type: 'technical', difficulty: 'Medium', timeLimit: 90 },
    { text: 'Five', category: 'Problem Solving', type: 'problem-solving', difficulty: 'Hard', timeLimit: 120 },
  ]), /duplicated/);
});

export const practiceTypes = [
  { id: 'technical', title: 'Technical', description: 'Work through fundamentals, trade-offs, and practical problem solving.', duration: '12 min', difficulty: 'Intermediate', mode: 'Technical' },
  { id: 'hr', title: 'HR', description: 'Rehearse motivation, communication, and role-fit conversations.', duration: '10 min', difficulty: 'All levels', mode: 'HR' },
  { id: 'behavioral', title: 'Behavioral', description: 'Practice clear stories about teamwork, ownership, and growth.', duration: '10 min', difficulty: 'All levels', mode: 'Behavioral' },
  { id: 'resume', title: 'Resume Based', description: 'Rehearse questions grounded in your experience and recent projects.', duration: '12 min', difficulty: 'Intermediate', mode: 'Resume Based' },
  { id: 'placement', title: 'Mock Placement Interview', description: 'A focused campus-style round covering confidence, fundamentals, and fit.', duration: '15 min', difficulty: 'Beginner friendly', mode: 'Mock Placement Interview' },
];

export const demoQuestions = {
  Technical: [
    { question: 'How would you debug a feature that works locally but fails under load?', difficulty: 'Warm-up' },
    { question: 'Describe a technical trade-off you would explain to a non-technical teammate.', difficulty: 'Core' },
    { question: 'How do you decide what to test before shipping a change?', difficulty: 'Closing' },
  ],
  HR: [
    { question: 'What kind of team environment helps you do your best work?', difficulty: 'Warm-up' },
    { question: 'Tell me about a time you received difficult feedback.', difficulty: 'Core' },
    { question: 'What are you hoping to learn in your next role?', difficulty: 'Closing' },
  ],
  Behavioral: [
    { question: 'Tell me about a time you had to bring a project back on track.', difficulty: 'Warm-up' },
    { question: 'Describe a disagreement with a teammate and how you handled it.', difficulty: 'Core' },
    { question: 'What is a piece of feedback that changed how you work?', difficulty: 'Reflection' },
  ],
  'Resume Based': [
    { question: 'Walk me through a project you are proud of and the impact it had.', difficulty: 'Warm-up' },
    { question: 'What trade-off did you make while building that project?', difficulty: 'Core' },
    { question: 'If you had another month, what would you improve?', difficulty: 'Reflection' },
  ],
  'Mock Placement Interview': [
    { question: 'Tell me about yourself and what you are looking for next.', difficulty: 'Warm-up' },
    { question: 'How do you approach learning a concept you do not know yet?', difficulty: 'Core' },
    { question: 'Why should we choose you for this role?', difficulty: 'Closing' },
  ],
};

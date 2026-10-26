const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'Express',
  'MongoDB', 'SQL', 'MySQL', 'PostgreSQL', 'HTML', 'CSS', 'Tailwind', 'Redux',
  'Django', 'Flask', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'GraphQL',
  'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Firebase',
  'Next.js', 'Vue', 'Angular', 'PHP', 'Go', 'Rust', 'Kotlin', 'Data Structures',
  'Algorithms', 'OOP', 'Linux', 'CI/CD', 'Spring Boot', 'Redis',
];

const SECTION_NAMES = ['summary', 'education', 'experience', 'work experience', 'projects', 'certifications', 'achievements'];

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function unique(values, limit) {
  return [...new Set(values.map(clean).filter(Boolean))].slice(0, limit);
}

function sectionLines(text, names) {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const start = lines.findIndex((line) => names.includes(line.toLowerCase().replace(/:$/, '')));
  if (start < 0) return [];
  return lines.slice(start + 1).filter((line) => !SECTION_NAMES.includes(line.toLowerCase().replace(/:$/, ''))).slice(0, 12);
}

function parseResumeText(rawText) {
  const text = rawText.replace(/\u0000/g, '').trim();
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
  const phone = (text.match(/(?:\+?\d[\d\s().-]{7,}\d)/) || [''])[0].trim();
  const name = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(line) && !line.includes('@')) || '';
  const skills = unique(SKILLS.filter((skill) => new RegExp(`(^|[^A-Za-z0-9+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9+#])`, 'i').test(text)), 20);
  const experienceDetails = sectionLines(text, ['experience', 'work experience']);
  const education = sectionLines(text, ['education']);
  const projects = sectionLines(text, ['projects']);
  const certifications = sectionLines(text, ['certifications', 'certificates']);
  const achievements = sectionLines(text, ['achievements', 'awards']);
  const summary = sectionLines(text, ['summary', 'profile', 'objective']).slice(0, 4).join(' ');

  return {
    name,
    email,
    phone,
    summary,
    role: '',
    experience: '',
    skills,
    education,
    experienceDetails,
    projects,
    certifications,
    achievements,
  };
}

module.exports = { parseResumeText };

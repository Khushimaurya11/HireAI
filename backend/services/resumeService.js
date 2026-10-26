const Resume = require('../models/Resume');
const path = require('path');

function safeFilename(filename) {
  return path.basename(String(filename || 'resume.pdf')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'resume.pdf';
}

async function saveParsedResume({ userId, file, text, profile }) {
  return Resume.findOneAndUpdate(
    { userId, isActive: true },
    {
      $set: {
        filename: safeFilename(file.originalname),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        textLength: text.length,
        extractedText: text,
        profile,
        isActive: true,
      },
      $setOnInsert: { userId },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

module.exports = { saveParsedResume, safeFilename };

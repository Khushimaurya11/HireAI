const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { extractTextFromPDF } = require('../utils/pdfParser');
const { parseResumeText } = require('../utils/resumeParser');
const { saveParsedResume } = require('../services/resumeService');

function serializeResume(resume, includeText = false) {
  return {
    id: resume._id,
    filename: resume.filename,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    textLength: resume.textLength,
    profile: resume.profile,
    ...(includeText ? { extractedText: resume.extractedText } : {}),
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
}

async function uploadResume(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' });

    const text = await extractTextFromPDF(req.file.buffer);
    if (text.trim().length < 20) return res.status(422).json({ error: 'Could not extract readable text from this PDF' });

    const resume = await saveParsedResume({
      userId: req.user._id,
      file: req.file,
      text,
      profile: parseResumeText(text),
    });

    res.json({
      success: true,
      resumeId: resume._id,
      filename: resume.filename,
      profile: resume.profile,
      extractionStatus: 'text-extracted',
      metadata: { mimeType: resume.mimeType, sizeBytes: resume.sizeBytes, textLength: resume.textLength },
    });
  } catch (err) {
    console.error('[resume] uploadResume error:', err.message);
    if (['Invalid PDF file', 'Invalid or corrupted PDF file', 'No extractable text found in this PDF'].includes(err.message)) {
      return res.status(422).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to process resume' });
  }
}

async function listResumes(req, res) {
  const documents = await Resume.find({ userId: req.user._id }).sort({ updatedAt: -1 }).select('-extractedText');
  const resumes = documents.map((resume) => serializeResume(resume));
  res.json({ resumes });
}

async function getResume(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Resume not found' });
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: serializeResume(resume, true) });
}

module.exports = { uploadResume, listResumes, getResume };

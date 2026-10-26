const mongoose = require('mongoose');

const resumeProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    summary: { type: String, default: '' },
    role: { type: String, default: '' },
    experience: { type: String, default: 'Fresher / 0-1 yrs' },
    skills: { type: [String], default: [] },
    education: { type: [String], default: [] },
    experienceDetails: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, default: 'application/pdf' },
    sizeBytes: { type: Number, required: true, min: 1 },
    textLength: { type: Number, required: true, min: 0 },
    extractedText: { type: String, required: true },
    profile: { type: resumeProfileSchema, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);

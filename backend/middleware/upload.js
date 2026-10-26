const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // keep the PDF in memory, we only need it briefly for parsing

function fileFilter(req, file, cb) {
  const isPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!isPdf) return cb(new Error('Only PDF resumes are accepted'), false);
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

module.exports = upload;

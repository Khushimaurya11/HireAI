const express = require('express');
const { isAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadResume, listResumes, getResume } = require('../controllers/resumeController');

const router = express.Router();

router.post('/upload', isAuth, upload.single('resume'), uploadResume);
router.get('/', isAuth, listResumes);
router.get('/:id', isAuth, getResume);

module.exports = router;

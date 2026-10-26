const express = require('express');
const { googleAuth, register, login, me, updateProfile, logout } = require('../controllers/authController');
const { isAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/google', googleAuth);
router.post('/register', register);
router.post('/login', login);
router.get('/me', isAuth, me);
router.patch('/profile', isAuth, updateProfile);
router.post('/logout', logout);

module.exports = router;

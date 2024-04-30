const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); // 세션 미들웨어 추가

const dotenv = require("dotenv"); 
require('dotenv').config();


// 쿠키 파서와 세션 미들웨어 사용 설정
router.use(cookieParser());
router.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false
}));


// oauth 라우터 추가
const naverAPI = require('./login/naver');
router.use('/naver', naverAPI);


module.exports = router;
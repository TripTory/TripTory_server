const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require("cors");
const { User } = require('../user/user_schema');
const dotenv = require("dotenv"); 
require('dotenv').config();

dotenv.config();

const corsOptions = {
  origin: process.env.FRONT_URL,
  credentials: true
};

router.use(cors(corsOptions));

router.get('/', (req, res) => {
  try {
    // 카카오 인증 URL 생성 
    const authorizationUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_ID}&redirect_uri=${process.env.KAKAO_URI}&response_type=code`;
    //res.redirect(oauthUrl);
    res.json({ authorizationUrl });
  } catch (error) {
    console.error("Failed to generate Naver OAuth authorization URL:", error);
    res.status(500).json({ error: "Failed to generate authorization URL" });
  }
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    // 토큰 요청
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_ID,
        client_secret: process.env.KAKAO_SECRET,
        redirect_uri: process.env.KAKAO_URI,
        code: code
      }
    });

    const accessToken = tokenResponse.data.access_token;

    try {
      // 사용자 정보 요청
      const userInfoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const kakaoUserData = userInfoResponse.data;

      let user = await User.findOne({ oauthId: kakaoUserData.id });

      if (!user) {
        user = new User({
          oauthId: kakaoUserData.id,
          name: kakaoUserData.properties.nickname, // 이름은 properties 안에 있음
          email: kakaoUserData.kakao_account.email,
          authprovider: "kakao",
          oauthAccessToken: accessToken
        });

        await user.save();

        req.session.userId = user._id;
        res.cookie('userSession', JSON.stringify(req.session), { maxAge: 86400 * 1000 });

        //res.json({ message: '회원가입 성공', email: kakaoUserData.kakao_account.email });
        res.redirect(`${process.env.FRONT_URL}/agree`);
      }
      else {
        req.session.userId = user._id;
        res.cookie('userSession', JSON.stringify(req.session), { maxAge: 86400 * 1000 });

        await User.findByIdAndUpdate(user._id, {
          oauthAccessToken: accessToken
        }, { new: true });

        //res.json({ message: '로그인 성공', email: kakaoUserData.kakao_account.email });
        res.redirect(`${process.env.FRONT_URL}/home`);
      }
    } catch (error) {
      if (error.code === 11000 && error.keyPattern.email) {
        // 중복된 이메일 주소로 인한 오류 (kakao에 구글,네이버 이메일로 가입한 경우 발생)
        return res.status(400).json({ error: '이미 가입된 이메일입니다. 다른 방식으로 로그인해주세요.' });
      } else {
        console.error('사용자 정보 요청 실패:', error);
        res.status(500).send('사용자 정보 요청 실패');
      }
    }
  } catch (error) {
    console.error('토큰 요청 실패:', error);
    res.status(500).send('토큰 요청 실패');
  }
});

module.exports = router;

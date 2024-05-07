const express = require('express');
const router = express.Router();
const axios = require('axios');
const { User } = require('../user/user_schema');

const dotenv = require("dotenv");
require('dotenv').config();

router.get('/', async (req, res) => {
    const scope = encodeURIComponent('profile email');
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_ID}&redirect_uri=${process.env.GOOGLE_URI}&scope=${scope}&state=state_parameter_passthrough_value`;
    res.redirect(oauthUrl);
});


// 콜백 처리
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    // 인증 코드를 사용하여 액세스 토큰 요청
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = {
        code: code,
        client_id: process.env.GOOGLE_ID,
        client_secret: process.env.GOOGLE_SECRET,
        redirect_uri: process.env.GOOGLE_URI,
        grant_type: 'authorization_code'
    };

    try {
        const tokenResponse = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenResponse.data.access_token; // 액세스 토큰

        // 액세스 토큰을 사용하여 사용자 정보 요청
        const userUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
        const userResponse = await axios.get(userUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // 사용자 정보를 변수에 할당
        const googleUserData = userResponse.data;

        // 데이터베이스에서 사용자 정보 조회
        let user = await User.findOne({ oauthId: googleUserData.id });

        // 새로운 사용자인지 확인
        if (!user) {
            user = new User({
                oauthId: googleUserData.id,
                name: googleUserData.name,
                email: googleUserData.email,
                oauthAccessToken: accessToken
                // 다른 사용자 정보 필드 추가 가능
            });

            await user.save(); // 새로운 사용자 정보 저장

            res.json({ message: '회원가입 성공', email: googleUserData.email });

        } else {

            await User.findByIdAndUpdate(user._id, {
                oauthAccessToken: accessToken
            }, {new: true} );
            
            // 기존 사용자인 경우 로그인 메시지 응답
            res.json({ message: '로그인 성공', email: googleUserData.email });
        }

    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
            // 중복된 이메일 주소로 인한 오류
            return res.status(400).json({ error: '중복된 이메일 주소입니다.' });
        } else {
            console.error('사용자 정보 요청 실패:', error);
            res.status(500).send('사용자 정보 요청 실패');
        }
    }

});

module.exports = router;

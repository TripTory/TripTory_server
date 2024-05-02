const express = require('express');
const router = express.Router();
const axios = require('axios');
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 

const { User } = require('./user_schema');

const dotenv = require("dotenv"); 
require('dotenv').config();


router.get('/', async (req, res) => {
    console.log("사용자 정보 요청");
    try {
      if (req.session && req.session.userId) {
        // 세션에서 사용자 ID를 사용하여 사용자를 식별하고 작업을 수행
        const userId = req.session.userId;
        // 사용자 ID를 기반으로 사용자 정보를 가져옴
        const user = await User.findById(userId);
        if (user) {
          // 사용자 정보가 있으면 응답
          return res.status(200).json({
            success: true,
            user,
          });
        } else {
          console.log('사용자를 찾을 수 없습니다.');
          return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
      } else {
        // 세션이나 사용자 ID가 없는 경우
        res.status(401).send('로그인이 필요합니다.');
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
});


router.put('/', async (req, res) => {
    console.log('사용자 정보 수정 요청');
    try {
        if(req.session && req.session.userId){
            const user = await User.findById(req.session.userId);
            if(user){
                console.log('수정할 사용자 ID:', user._id);
    
                const updateuser = await User.findByIdAndUpdate(user._id, {
                    name: req.body.name,
                    email: req.body.email
                }, {new: true} );
    
                if (updateuser) {
                    console.log('사용자 정보 수정 완료');
                    return res.status(200).json({
                    success: true,
                    user: updateuser
                    });
                } else {
                    console.log('사용자 정보 수정 실패');
                    return res.status(400).json({ success : false, message : '사용자 정보 수정 실패'});
                }
    
            } else {
                console.log('사용자를 찾을 수 없습니다.');
                return res.status(404).json({ success : false, message : '사용자를 찾을 수 없습니다.' });
            }
        } else {
            // 세션이나 사용자 ID가 없는 경우
            res.status(401).send('로그인이 필요합니다.');
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});


router.delete('/', async (req, res) => {
    console.log('사용자 정보 삭제 요청');
    try{
        if(req.session && req.session.userId){
            const user = await User.findById(req.session.userId);

            if(user){
                console.log('삭제할 사용자 ID:', user._id);
        
                await User.findByIdAndDelete(user._id);
        
                return res.status(200).json({
                    success: true,
                    message: '사용자 정보 삭제 완료'
                });
            } else {
                console.log('사용자를 찾을 수 없습니다.');
                return res.status(404).json({ success : false, message : '사용자를 찾을 수 없습니다.' });
            }
        } else {
            // 세션이나 사용자 ID가 없는 경우
            res.status(401).send('로그인이 필요합니다.');
        }
    } catch(err) {
        console.error(err);
        return res.status(500).json({ success : false, message : '서버 오류' });
    }
})
  


module.exports = router;

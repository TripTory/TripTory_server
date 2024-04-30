const express = require('express');
const router = express.Router();
const axios = require('axios');

const { User } = require('./user_schema');

const dotenv = require("dotenv"); 
require('dotenv').config();


router.get('/', async (req, res) => {
    console.log("사용자 정보 요청");
    try {
      const user = await User.findById(req.body.userId);
  
      if (user) { // 여행 목록이 비어있지 않은지 확인
        return res.status(200).json({
          success: true,
          user,
        });
      } else {
        console.log('해당 사용자를 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '해당 사용자를 찾을 수 없습니다.' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '서버 오류' });
    }
});


router.put('/', async (req, res) => {
    console.log('사용자 정보 수정 요청');
    try {
        const user = await User.findById(req.body.userId);
        if(user){
            console.log('수정할 사용자 ID:', user._id);

            const updateuser = await User.findByIdAndUpdate(req.body.userId, {
                name: req.body.name,
                email: req.body.email
            }, {new: true} );

            if (updateuser) {
                console.log('사용자 정보 수정 완료');
                return res.status(200).json({
                success: true,
                travel: updateuser
                });
            } else {
                console.log('사용자 정보 수정 실패');
                return res.status(400).json({ success : false, message : '사용자 정보 수정 실패'});
            }

        } else {
        console.log('사용자를 찾을 수 없습니다.');
        return res.status(404).json({ success : false, message : '사용자를 찾을 수 없습니다.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});



  


module.exports = router;

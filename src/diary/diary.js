const express = require('express');
const router = express.Router();

const { User } = require('../user/user_schema');
const { Travel } = require('../travel/travel_schema');
const { Diary} = require('./diary_schema');

router.post('/', async (req, res) => {
  console.log("일기 생성 요청");
  try {
    const user = await User.findById(req.body.userId);
    const travel = await Travel.findById(req.body.travel);
    if(travel){
        console.log('여행 ID:', travel._id);
        if (user) {
            console.log('사용자 ID:', user._id);

            const diary = new Diary({
              title: req.body.title,
              content: req.body.content,
              location: req.body.location,
              date: req.body.date,
              travel: [travel._id],
              userId: [user._id]
            });
      
            const savedDiary = await diary.save(); // 여행 객체 저장
            
            return res.status(200).json({
              success: true,
              diaryInfo: savedDiary,
            });
        } else {
            console.log('사용자를 찾을 수 없습니다.');
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        } 
    } else {
        console.log('여행을 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '여행을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;

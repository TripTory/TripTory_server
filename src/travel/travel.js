const express = require('express');
const router = express.Router();

const { User } = require('../user/user_schema');
const { Travel } = require('./travel_schema');

router.post('/', async (req, res) => {
  console.log("여행 생성 요청");
  try {
    const user = await User.findById(req.body.author);
    if (user) {
      console.log('사용자 ID:', user._id);

      const travel = new Travel({
        title: req.body.title,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        location: req.body.location,
        invited: [user._id] // 초대된 사용자 배열에 현재 사용자 추가
      });

      const savedTravel = await travel.save(); // 여행 객체 저장
      
      return res.status(200).json({
        success: true,
        travelInfo: savedTravel,
      });
    } else {
      console.log('사용자를 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.post('/:id/invite', async (req, res) => {
  console.log("여행 초대 요청");
  try {
    const travel = await Travel.findById(req.params.id);
    if (travel) {
      console.log('여행 ID:', travel._id);

      const user = await User.findById(req.body.userId);
      if (user) {
        console.log('초대할 사용자 ID:', user._id);

        if (travel.invited.includes(user._id)) {
          console.log('이미 초대된 사용자입니다.');
          return res.status(400).json({ success: false, message: '이미 초대된 사용자입니다.' });
        }

        travel.invited.push(user._id); // 초대된 사용자 배열에 추가
        const savedTravel = await travel.save(); // 여행 객체 저장

        return res.status(200).json({
          success: true,
          travelInfo: savedTravel,
        });
      } else {
        console.log('초대할 사용자를 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '초대할 사용자를 찾을 수 없습니다.' });
      }
    } else {
      console.log('여행을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '여행을 찾을 수 없습니다.'});
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});


module.exports = router;

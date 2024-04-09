const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { User } = require('../user/user_schema');
const { Travel } = require('./travel_schema');

router.get('/', async (req, res) => {
  console.log("여행 목록 요청");
  try {
    const travels = await Travel.find({ invited: req.body.userId });

    if (travels.length > 0) { // 여행 목록이 비어있지 않은지 확인
      return res.status(200).json({
        success: true,
        travels,
      });
    } else {
      console.log('해당 사용자의 여행 목록을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 사용자의 여행 목록을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.get('/:travelid', async (req, res) => {
  console.log("특정 여행 조회 요청");
  try {
    const travel = await Travel.findById(req.params.travelid);

    if (travel) { // 특정 여행을 찾았는지 확인
      return res.status(200).json({
        success: true,
        travel,
      });
    } else {
      console.log('해당 여행을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 여행을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});


router.post('/', async (req, res) => {
  console.log("여행 생성 요청");
  try {
    const user = await User.findById(req.body.userId);
    if (user) {
      console.log('사용자 ID:', user._id);

      let ivtoken; 

      while(true) {
        ivtoken = crypto.randomBytes(16).toString('hex'); // 16바이트의 랜덤 토큰 생성
        const unique = await Travel.find({ ivtoken: ivtoken });
        if(!unique.length)
          break;
      }
      
      const travel = new Travel({
        title: req.body.title,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        location: req.body.location,
        invited: [user._id], // 초대된 사용자 배열에 현재 사용자 추가
        ivtoken: ivtoken
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

router.put('/:travelid/invite', async (req, res) => {
  console.log("여행 초대 요청");
  try {
    const travel = await Travel.findById(req.params.travelid);
    if (travel) {
      console.log('여행 ID:', travel._id);

      const user = await User.findById(req.body.userId);

      if(req.body.ivtoken == travel.ivtoken) {
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
        console.log('토큰이 올바르지 않습니다.');
        return res.status(400).json({ success: false, message: '토큰이 올바르지 않습니다.' });
      }
    } else {
      console.log('해당 여행을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '여행을 찾을 수 없습니다.'});
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.put('/:travelid', async (req, res) => {
  console.log('여행 수정 요청');
  try {
    const travel = await Travel.findById(req.params.travelid);
    if(travel){
      console.log('수정할 여행 ID:', travel._id);

      const user = await User.findById(req.body.userId);
      if (!travel.invited.includes(user._id)) {
        console.log('여행에 대한 권한이 없습니다.');
        return res.status(400).json({ success: false, message: '여행에 대한 권한이 없습니다.' });
      }

      const updatetravel = await Travel.findByIdAndUpdate(req.params.travelid, {
        title: req.body.title,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        location: req.body.location,
        invited: [user._id] // 초대된 사용자 배열에 현재 사용자 추가
      }, {new: true} );

      if (updatetravel) {
        console.log('여행 수정 완료');
        return res.status(200).json({
          success: true,
          travel: updatetravel
        });
      } else {
        console.log('여행 수정 실패');
        return res.status(400).json({ success : false, message : '여행 수정 실패'});
      }

    } else {
      console.log('해당 여행을 찾을 수 없습니다.');
      return res.status(404).json({ success : false, message : '해당 여행을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.delete('/:travelid', async (req, res) => {
  console.log('여행 삭제 요청');
  try{
    const travel = await Travel.findById(req.params.travelid);

    if(travel){
      console.log('삭제할 여행 ID:', travel._id);

      await Travel.findByIdAndDelete(travel._id);

      return res.status(200).json({
        success: true,
        message: '여행 삭제 완료'
      });
    } else {
      console.log('해당 여행을 찾을 수 없습니다.');
      return res.status(404).json({ success : false, message : '해당 여행을 찾을 수 없습니다.' });
    }
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success : false, message : '서버 오류' });
  }
})


module.exports = router;
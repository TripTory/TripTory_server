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

router.delete('/:diaryId', async(req, res) => {
  console.log('일기 삭제 요청');
  try {
    const diary = await Diary.findById(req.params.diaryId);

    if(diary){
      console.log('삭제할 여행 ID:', diary._id);

      if (diary.userId != req.body.userId) {
        console.log('일기에 대한 권한이 없습니다.');
        return res.status(400).json({ success: false, message: '일기에 대한 권한이 없습니다.' });
      }

      await Diary.findByIdAndDelete(diary._id);

      return res.status(200).json({
        success: true,
        message: '여행 삭제 완료'
      });

    } else {
      console.log('일기를 찾을 수 없습니다.');
      return res.status(400).json({ success: false, message: '일기를 찾을 수 없습니다.'});
    }
  } catch(err){
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.put('/:diaryId', async(req,res) => {
  console.log('일기 수정 요청');
  try {
    const diary = await Diary.findById(req.params.diaryId);
    if(diary) {
      console.log('수정할 여ᅙᅢᆼ ID:', diary._id);

      if(diary.userId != req.body.userId){
        console.log('일기에 대한 권한이 없습니다.');
        return res.status(400).json({ success: false, message: '일기에 대한 권한이 없습니다.' });
      }
      
      const updatediary = await Diary.findByIdAndUpdate(req.params.diaryId, {
        title: req.body.title,
        content: req.body.content,
        location: req.body.location,
        date: req.body.date
      }, { new: true });

      if(updatediary){
        console.log('일기 수정 완료');
        return res.status(200).json({ success: true, message: '일기 수정 완료' });
      } else {
        console.log('일기 수정 실패');
        return res.status(400).json({ success: false, message: '일기 수정 실패'});
      }
    } else {
      console.log('해당 일기를 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 일기를 찾을 수 없습니다.' });
    }
  } catch(err) {
    console.log(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.get('/', async(req, res) => {
  console.log('일기 목록 요청');
  try {
    const diarys = await Diary.find({ userId: req.body.userId });

    if(diarys.length > 0){
      return res.status(200).json({
        success: true,
        diarys
      });
    } else {
      console.log('해당 사용자의 일기 목록을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 사용자의 일기 목록을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});



module.exports = router;

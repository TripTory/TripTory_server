const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

const { User } = require('../user/user_schema');
const { Travel } = require('../travel/travel_schema');
const { Diary} = require('./diary_schema');
const ImageTagAnalyze = require('../AI/ImageTagAnalyze'); // 이미지 태그 분류 함수를 포함한 파일

// Google Cloud Storage 설정
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID, // GCP 프로젝트 ID
  keyFilename: process.env.STORAGE_KEYFILE // 서비스 계정 키 파일 경로
});

const bucketName = process.env.STORAGE_BUCKET_NAME; // GCS 버킷 이름
const bucket = storage.bucket(bucketName);

// Multer 설정
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

router.get('/', async(req, res) => {
  console.log('일기 목록 요청');
  try {
    if(req.session && req.session.userId){
      const diarys = await Diary.find({ userId: req.session.userId });

      if(diarys.length > 0){
        return res.status(200).json({
          success: true,
          diarys
        });
      } else {
        console.log('해당 사용자의 일기 목록을 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '해당 사용자의 일기 목록을 찾을 수 없습니다.' });
      }
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.get('/travel/:travelId', async(req, res) => {
  console.log('여행별 일기 목록 요청');
  try {
    const diarys = await Diary.find({ travel: req.params.travelId });

    if(diarys.length > 0){
      return res.status(200).json({
        success: true,
        diarys
      });
    } else {
      console.log('해당 여행의 일기 목록을 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 여행의 일기 목록을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.get('/:diaryId', async(req, res) => {
  console.log('특정 일기 조회 요청');
  try {
    const diary = await Diary.findById(req.params.diaryId);

    if(diary){
      return res.status(200).json({
        success: true,
        diary
      });
    } else {
      console.log('해당 일기를 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 일기를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '해당 일기를 찾을 수 없습니다.' });
  }
});

router.post('/', upload.array('images', 10), async (req, res) => {
  console.log("일기 생성 요청");
  try {
    if (req.session && req.session.userId){
      const user = await User.findById(req.session.userId);
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

          const files = req.files;
          for (const file of files) {
            const tags = await ImageTagAnalyze.tagAndTranslateImage(file.buffer); // 수정된 부분
            const img = storage.bucket(bucketName).file(`diary/${diary._id}/${file.originalname}`);
            await img.save(file.buffer);
            diary.img.push({ imgpath: img.publicUrl(), tag: tags });
          }

          await diary.save(); // 여행 객체 저장
          
          console.log('일기 생성 완료');
          return res.status(200).json({ success: true, message: '일기 생성 완료', diaryInfo: diary});
        } else {
          console.log('사용자를 찾을 수 없습니다.');
          return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        } 
      } else {
        console.log('여행을 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '여행을 찾을 수 없습니다.' });
      }
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.put('/:diaryId', upload.array('images', 10), async(req,res) => {
  console.log('일기 수정 요청');
  try {
    if(req.session && req.session.userId){
      const diary = await Diary.findById(req.params.diaryId);

      if(diary) {
        console.log('수정할 여ᅙᅢᆼ ID:', diary._id);
  
        if(diary.userId != req.session.userId){
          console.log('일기에 대한 권한이 없습니다.');
          return res.status(403).json({ success: false, message: '일기에 대한 권한이 없습니다.' });
        }
        
        if(req.body.imgmodified){
          console.log(req.body.imgmodified);
          const [files] = await storage.bucket(bucketName).getFiles({
            prefix: `diary/${diary._id}`,
          });
          await Promise.all(files.map(file => file.delete()));

          diary.img = [];

          const imgfiles = req.files;
          for (const file of imgfiles) {
            const tags = await ImageTagAnalyze.tagAndTranslateImage(file.buffer); // 수정된 부분
            const img = storage.bucket(bucketName).file(`diary/${diary._id}/${file.originalname}`);
            await img.save(file.buffer);
            diary.img.push({ imgpath: img.publicUrl(), tag: tags });
          }
          
          await diary.save();
        }

        await Diary.findByIdAndUpdate(req.params.diaryId, {
          title: req.body.title,
          content: req.body.content,
          location: req.body.location,
          date: req.body.date
        }, { new: true });
  
        console.log('일기 수정 완료');
        return res.status(200).json({ success: true, message: '일기 수정 완료' });

      } else {
        console.log('해당 일기를 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '해당 일기를 찾을 수 없습니다.' });
      }
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch(err) {
    console.log(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.delete('/:diaryId', async(req, res) => {
  console.log('일기 삭제 요청');
  try {
    if (req.session && req.session.userId){
      const diary = await Diary.findById(req.params.diaryId);

      if(diary){
        console.log('삭제할 여행 ID:', diary._id);
  
        if (diary.userId != req.session.userId) {
          console.log('일기에 대한 권한이 없습니다.');
          return res.status(403).json({ success: false, message: '일기에 대한 권한이 없습니다.' });
        }
  
        await Diary.findByIdAndDelete(diary._id);    

        const [files] = await storage.bucket(bucketName).getFiles({
          prefix: `diary/${diary._id}`,
        });
        await Promise.all(files.map(file => file.delete()));
  
        console.log('일기 삭제 완료');
        return res.status(200).json({ success: true, message: '일기 삭제 완료' });
  
      } else {
        console.log('일기를 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '일기를 찾을 수 없습니다.'});
      }
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.'});
    }
  } catch(err){
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;

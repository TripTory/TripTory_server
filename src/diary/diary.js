const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const cors = require('cors');

const { User } = require('../user/user_schema');
const { Travel } = require('../travel/travel_schema');
const { Diary} = require('./diary_schema');
const ImageTagAnalyze = require('../AI/ImageTagAnalyze'); // 이미지 태그 분류 함수를 포함한 파일

const corsOptions = {
  origin: process.env.FRONT_URL, // 허용할 출처
  credentials: true // 인증 정보 허용
};

router.use(cors(corsOptions));


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

async function getSignedUrl_diary(diaryId, img) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 1000, // 1분 동안 유효
  };

  try {
    const [url] = await bucket.file(`diary/${diaryId}/${img.imgpath}`).getSignedUrl(options);
    return url;
  } catch (err) {
    console.error('이미지 URL 생성 실패:', err);
    return "";
  }
}

async function getSignedUrl_user(userId) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 1000, // 1분 동안 유효
  };

  try {
    const [url] = await bucket.file(`user/${userId}`).getSignedUrl(options);
    return url;
  } catch (err) {
    console.error('이미지 URL 생성 실패:', err);
    return "";
  }
}

router.get('/', async(req, res) => {
  console.log('일기 목록 요청');
  try {
    const sessionCookie = req.cookies.userSession;
    const sessionData = JSON.parse(sessionCookie);

    if (sessionData && sessionData.userId) {
      const diarys = await Diary.find({ userId: sessionData.userId });

      if(diarys.length > 0){

        let diarys_info = []

        for(const diary of diarys) {
          if(diary.img[0]){
            const url = await getSignedUrl_diary(diary._id, diary.img[0]);
            diarys_info.push({ diary, url });
          }
          else diarys_info.push({ diary, url: "" });
        }  

        return res.status(200).json({
          success: true,
          diarys_info,
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

      let diarys_info = []

      for(const diary of diarys) {
        if(diary.img[0]){
          const url = await getSignedUrl_diary(diary._id, diary.img[0]);
          diarys_info.push({ diary, url });
        }
        else diarys_info.push({ diary, url: "" });
      }

      return res.status(200).json({
        success: true,
        diarys_info
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

      const userUrl = await getSignedUrl_user(diary.userId);

      let diaryImgUrl = []
      if(diary.img){
        for(const img of diary.img){
          const url = await getSignedUrl_diary(diary._id, img);
          diaryImgUrl.push(url);
        }
      }

      const diaryObj = diary.toObject();
      const { img, ...diaryinfo } = diaryObj;

      console.log(diaryinfo);

      return res.status(200).json({
        success: true,
        diaryinfo,
        diaryImgUrl,
        userUrl
      });
    } else {
      console.log('해당 일기를 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 일기를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.post('/', upload.array('images', 10), async (req, res) => {
  console.log("일기 생성 요청");
  try {
    const sessionCookie = req.cookies.userSession;
    const sessionData = JSON.parse(sessionCookie);

    if (sessionData && sessionData.userId) {
      const user = await User.findById(sessionData.userId);
      const travel = await Travel.findById(req.body.travel);
      if(travel){
        console.log('여행 ID:', travel._id);

        if (user) {
          console.log('사용자 ID:', user._id);

          const diary = new Diary({
            title: req.body.title,
            content: req.body.content,
            date: req.body.date,
            travel: [travel._id],
            userId: [user._id],
            userName: user.name
          });

          if(req.files){
            const files = req.files;
            for (const file of files) {
              const tags = await ImageTagAnalyze.tagAndTranslateImage(file.buffer); // 수정된 부분
              const img = storage.bucket(bucketName).file(`diary/${diary._id}/${file.originalname}`);
              await img.save(file.buffer);
              diary.img.push({ imgpath: file.originalname, tag: tags });
            }   
          }

          await diary.save(); // 여행 객체 저장
          
          console.log('일기 생성 완료');
          return res.status(200).json({ success: true, message: '일기 생성 완료', diaryid: diary._id });
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
    const sessionCookie = req.cookies.userSession;
    const sessionData = JSON.parse(sessionCookie);

    if (sessionData && sessionData.userId) {
      const diary = await Diary.findById(req.params.diaryId);

      if(diary) {
        console.log('수정할 여ᅙᅢᆼ ID:', diary._id);
  
        if(diary.userId != sessionData.userId){
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

          if(req.files){
            const imgfiles = req.files;
            for (const file of imgfiles) {
              const tags = await ImageTagAnalyze.tagAndTranslateImage(file.buffer); // 수정된 부분
              const img = storage.bucket(bucketName).file(`diary/${diary._id}/${file.originalname}`);
              await img.save(file.buffer);
              diary.img.push({ imgpath: file.originalname, tag: tags });
            }
          }
          
          await diary.save();
        }

        await Diary.findByIdAndUpdate(req.params.diaryId, {
          title: req.body.title,
          content: req.body.content,
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
    const sessionCookie = req.cookies.userSession;
    const sessionData = JSON.parse(sessionCookie);

    if (sessionData && sessionData.userId) {
      const diary = await Diary.findById(req.params.diaryId);

      if(diary){
        console.log('삭제할 여행 ID:', diary._id);
  
        if (diary.userId != sessionData.userId) {
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

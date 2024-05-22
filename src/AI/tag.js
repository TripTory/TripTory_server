const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const cors = require('cors');

const { Diary} = require('../diary/diary_schema');

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

async function getSignedUrl(diaryId, img) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 1분 동안 유효
  };

  try {
    const [url] = await bucket.file(`diary/${diaryId}/${img.imgpath}`).getSignedUrl(options);
    return url;
  } catch (err) {
    console.error('이미지 URL 생성 실패:', err);
    return "";
  }
}

router.get('/', async(req, res) => {
  console.log('태그 이미지 요청: ');
  try {
    if (req.session && req.session.userId) {
      const diarys = await Diary.find({ userId: req.session.userId });

      if(diarys.length <= 0){
        console.log("사용자 일기에 사진이 없습니다.")
        return res.status(404).json({ success: false, message: "사용자 일기에 사진이 없습니다." })
      }

      if(!req.body.tag){
        console.log("각 태그별 대표 이미지 요청")
        const imageTags = {};
        for (const diary of diarys) {
          if (diary.img) 
            for (const img of diary.img) 
              if (img.tag) 
                for (const tag of img.tag) 
                  if (!imageTags[tag]) {
                    const url = await getSignedUrl(diary._id, img);
                    imageTags[tag] = url; // 새로운 태그인 경우 해당 이미지로 초기화
                  }
        }
  
        return res.status(200).json({
          success: true,
          imageTags
        });
      } 
      
      else {
        const tagName = req.body.tag;
        console.log(`${tagName}에 대한 이미지 요청`)

        let images = [];
        for (const diary of diarys) {
          if (diary.img) 
            for (const img of diary.img) 
              if (img.tag && img.tag.includes(tagName)) {
                const url = await getSignedUrl(diary._id, img);
                images.push(url);
              }
        }
  
        return res.status(200).json({
          success: true,
          images
        });
      }
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json ({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;

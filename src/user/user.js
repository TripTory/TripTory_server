const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

const { User } = require('./user_schema');

const dotenv = require("dotenv"); 
require('dotenv').config();

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

function getSignedUrl(user, res) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 1000, // 1분 동안 유효
  };

  bucket.file(`user/${user._id}`).getSignedUrl(options, (err, url) => {
    if (err) {
      console.error('이미지 URL 생성 실패:', err);
      return res.status(500).json({ success: false, message: '이미지 URL 생성 실패' });
    }
    // user 객체를 단순한 JavaScript 객체로 변환하고 필요한 필드만 추출
    const userObj = user.toObject();
    const { oauthId, oauthAccessToken, profileimg, ...userinfo } = userObj;
    return res.status(200).json({ success: true, userinfo, url });
  });
}

router.get('/', async (req, res) => {
  console.log("사용자 정보 요청");
  try {
    if (req.session && req.session.userId) {
      // 사용자 ID를 기반으로 사용자 정보를 가져옴
      const user = await User.findById(req.session.userId);

      if (user) {
        if (!user.profileimg){
          // user 객체를 단순한 JavaScript 객체로 변환하고 필요한 필드만 추출
          const userObj = user.toObject();
          const { oauthId, oauthAccessToken, profileimg, ...userinfo } = userObj;
          return res.status(200).json({ success: true, userinfo });
        }

        getSignedUrl(user, res);

      } else {
        console.log('사용자를 찾을 수 없습니다.');
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
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


router.get('/:userid', async (req, res) => {
  console.log("사용자 정보 요청");
  try {
    const user = await User.findById(req.params.userid);

    if (user) {
      if (!user.profileimg){
        const { oauthId, oauthAccessToken, profileimg, ...userinfo } = user;
        return res.status(200).json({ success: true, userinfo });
      }

      getSignedUrl(user, res);

    } else {
      console.log('사용자를 찾을 수 없습니다.');
      return res.status(404).json({ success: false, message: '해당 사용자를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});


router.post('/logout', async (req, res) => {
  console.log('로그아웃 요청');
  try {
    if (req.session && req.session.userId){
      req.session.destroy(err => {
        if (err) {
          console.error('세션 제거 실패:', err);
          return res.status(500).send('세션 제거 실패');
        } else {
          console.log('로그아웃 성공');
          res.clearCookie('userSession'); // 쿠키도 제거합니다.
          return res.status(200).send('로그아웃 성공');
        }
      });
    } else {
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
})



router.put('/', upload.single('profileImg'), async (req, res) => {
  console.log('사용자 정보 수정 요청');
  try {
    if(req.session && req.session.userId){
      const user = await User.findById(req.session.userId);
      if(user){
        console.log('수정할 사용자 ID:', user._id);

        if (req.file) {
            try{
            const profileImgFile = req.file;
            const file = bucket.file(`user/${user._id}`);    
  
            // GCS에 이미지 업로드
            await file.save(profileImgFile.buffer, { contentType: profileImgFile.mimetype });
        
            user.profileimg = user._id;
            await user.save();  
  
            console.log('프로필 사진 업로드 성공');
          } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: '프로필 사진 업로드에 실패했습니다.' });
          }
        } 

        const updateuser = await User.findByIdAndUpdate(user._id, {
          name: req.body.name,
          email: req.body.email
        }, {new: true} );

        if (updateuser) {
          console.log('사용자 정보 수정 완료');
          return res.status(200).json({ success: true, user: updateuser });
        } else {
          console.log('사용자 정보 수정 실패');
          return res.status(400).json({ success : false, message : '사용자 정보 수정 실패'});
        }
      } else {
        console.log('사용자를 찾을 수 없습니다.');
        return res.status(404).json({ success : false, message : '사용자를 찾을 수 없습니다.' });
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


router.delete('/', async (req, res) => {
    console.log('사용자 정보 삭제 요청');
    try{
      if(req.session && req.session.userId){
        const user = await User.findById(req.session.userId);

        if(user){
          console.log('삭제할 사용자 ID:', user._id);


          // OAuth provider 구분
          if(user.authprovider == 'naver') //naver
            await revokeNaverAccessToken(user.oauthAccessToken);
          
          else if(user.authprovider == 'kakao') //kakao
            await revokeKakaoAccessToken(user.oauthAccessToken);

          else await revokeGoogleAccessToken(user.oauthAccessToken); //google

          // Storage에서 삭제
          const [files] = await storage.bucket(bucketName).getFiles({
            prefix: `user/${user._id}`,
          });
          await Promise.all(files.map(file => file.delete()));

              
          // MongoDB에서 삭제
          await User.findByIdAndDelete(user._id);


          // 세션 및 쿠키 삭제
          req.session.destroy(err => {
            if (err) {
                console.error('세션 제거 실패:', err);
                return res.status(500).send('세션 제거 실패');
            } else {
                console.log('로그아웃 및 사용자 정보 삭제 완료');
                res.clearCookie('userSession');
                return res.status(200).json({ success: true, message: '로그아웃 및 사용자 정보 삭제 완료' });
            }
          });
        } else {
          console.log('사용자를 찾을 수 없습니다.');
          return res.status(404).json({ success : false, message : '사용자를 찾을 수 없습니다.' });
        }
      } else {
        console.log('로그인이 필요합니다.');
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }
    } catch(err) {
      console.error(err);
      return res.status(500).json({ success : false, message : '서버 오류' });
    }
})
  
// 네이버 OAuth 인증 해제 요청
async function revokeNaverAccessToken(accessToken) {
  const oauthUrl = 'https://nid.naver.com/oauth2.0/token';
  const params = {
    client_id: process.env.NAVER_ID,
    client_secret: process.env.NAVER_SECRET,
    grant_type: 'delete',
    access_token: accessToken,
    service_provider: 'NAVER',
  };

  try {
    const response = await axios.get(oauthUrl, { params });
    console.log('네이버 OAuth 인증 해제 요청 성공:', response.data);
  } catch (error) {
    console.error('네이버 OAuth 인증 해제 요청 실패:', error.response.data);
    throw error; // 오류를 호출자에게 다시 전달
  }
}

// 카카오 OAuth 인증 해제 요청
async function revokeKakaoAccessToken(accessToken) {
  const oauthUrl = 'https://kauth.kakao.com/oauth/invalidate';
  const params = {
    client_id: process.env.KAKAO_ID,
    client_secret: process.env.KAKAO_SECRET,
    access_token: accessToken,
  };

  try {
    const response = await axios.get(oauthUrl, { params });
    console.log('카카오 OAuth 인증 해제 요청 성공:', response.data);
  } catch (error) {
    console.error('카카오 OAuth 인증 해제 요청 실패:', error.response.data);
    throw error; // 오류를 호출자에게 다시 전달
  }
}

// 구글 OAuth 인증 해제 요청
async function revokeGoogleAccessToken(accessToken) {
  const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${accessToken}`;

  try {
      const response = await axios.get(revokeUrl);
      console.log('구글 OAuth 인증 해제 요청 성공:', response.data);
  } catch (error) {
      console.error('구글 OAuth 인증 해제 요청 실패:', error.response.data);
      throw error; // 오류를 호출자에게 다시 전달
  }
}

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); 
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

const { User } = require('./user_schema');

const dotenv = require("dotenv"); 
require('dotenv').config();

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
      console.log('로그인이 필요합니다.');
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

router.get('/logout', async (req, res) => {
  console.log('로그아웃 요청');
  try {
    if (req.session && req.session.userId){
      req.session.destroy(err => {
        if (err) {
          console.error('세션 제거 실패:', err);
          res.status(500).send('세션 제거 실패');
        } else {
          console.log('로그아웃 성공');
          res.clearCookie('userSession'); // 쿠키도 제거합니다.
          res.status(200).send('로그아웃 성공');
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
            const imageName = user._id.toString(); // 클라이언트에서 전송한 이미지 이름을 추출합니다.
            const file = bucket.file(`user/${imageName}`);    
  
            // GCS에 이미지 업로드
            await file.save(profileImgFile.buffer, { contentType: profileImgFile.mimetype });
        
            // MongoDB에 이미지 경로 저장
            const profileImgPath = `https://storage.googleapis.com/${bucketName}/user/${imageName}`;
            user.profileimg = profileImgPath;
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
    
          await User.findByIdAndDelete(user._id);

          // 네이버 OAuth 인증 해제 요청
          await revokeNaverAccessToken(user.oauthAccessToken);

          // 카카오 계정 탈퇴 요청
          await revokeKakaoAccessToken(user.oauthAccessToken);

          // 구글 OAuth 인증 해제 요청
          await revokeGoogleAccessToken(user.googleAccessToken);
    
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

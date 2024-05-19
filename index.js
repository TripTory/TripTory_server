// index.js
const express = require("express"); 
const cors = require("cors");
const axios = require('axios');
const cookieParser = require('cookie-parser'); // 쿠키 파서 미들웨어 추가
const session = require('express-session'); // 세션 미들웨어 추가

const dotenv = require("dotenv"); // .env 파일 사용 라이브러리
require('dotenv').config();

// express 앱 생성
const app = express(); 

const port = process.env.PORT;

app.use(express.json());

//app.use(cors());
// 클라이언트의 출처를 명시적으로 지정하고, 인증 정보를 허용
const corsOptions = {
    origin: 'http://localhost:3000', // 클라이언트의 출처
    credentials: true // 인증 정보 허용
  };
  app.use(cors(corsOptions));

// 쿠키 파서와 세션 미들웨어 사용 설정
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false
}));


// connect mongoose
const mongoose = require('mongoose');

const MongoConnect = async () => await mongoose.connect(
    process.env.MONGODB_URI,
    {
        // useNewUrlPaser: true,
        // useUnifiedTofology: true,
        // useCreateIndex: true,
        // useFindAndModify: false,
    }
)
MongoConnect().then(() => console.log('MongoDB connected'))
.catch((err) => {
    console.log(err);
});

app.get('/', function (req, res) {
    res.send("Server Start!!");
});

const travelAPI = require("./src/travel/travel");
app.use('/travel', travelAPI);

const diaryAPI = require("./src/diary/diary");
app.use('/diary', diaryAPI);

const userAPI = require("./src/user/user");
app.use('/user', userAPI);

const oauthAPI = require("./src/oauth");
app.use('/oauth', oauthAPI);
  
app.listen(port, () => console.log(`${port}포트입니다.`));
  

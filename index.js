// index.js
const express = require("express"); 
const cors = require("cors");
const axios = require('axios');

const dotenv = require("dotenv"); // .env 파일 사용 라이브러리
require('dotenv').config();

// express 앱 생성
const app = express(); 

const port = process.env.PORT;

app.use(express.json());
app.use(cors());

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

const oauthAPI = require("./src/oauth");
app.use('/oauth', oauthAPI);
  
app.listen(port, () => console.log(`${port}포트입니다.`));
  

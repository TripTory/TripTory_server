// index.js
const express = require("express"); 
const cors = require("cors");
const dotenv = require("dotenv"); // .env 파일 사용 라이브러리
const mongoose = require('mongoose');
const axios = require('axios');

const bodyParser = require("body-parser"); // body-parser 라이브러리 사용
dotenv.config(); // dotevn 라이브러리 사용

// express 앱 생성
const app = express(); 

const port = process.env.PORT;

app.use(express.json());

// connect mongoose
const mongoose = require('mongoose');

mongoose.connect(
    process.env.MONGODB_URI,
    {
        // useNewUrlPaser: true,
        // useUnifiedTofology: true,
        // useCreateIndex: true,
        // useFindAndModify: false,
    }
)
.then(() => console.log('MongoDB connected'))
.catch((err) => {
    console.log(err);
});

app.get('/', function (req, res) {
    res.send("Server Start!!");
});
  
app.listen(port, () => console.log(`${port}포트입니다.`));
  

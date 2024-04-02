// index.js
const express = require("express"); 
const cors = require("cors");
const dotenv = require("dotenv"); // .env 파일 사용 라이브러리

const bodyParser = require("body-parser"); // body-parser 라이브러리 사용
dotenv.config(); // dotevn 라이브러리 사용

// express 앱 생성
const app = express(); 

const port = process.env.PORT;

app.use(express.json());

app.get('/', function (req, res) {
    res.send("Server Start!!");
});
  
app.listen(port, () => console.log(`${port}포트입니다.`));
  

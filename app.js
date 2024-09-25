const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { mongoDb, environment, portNumber } = require('./config/config');
const app = express();
const indexRouter = require("./routes/index");
const { databaseConnection } = require("./config/database");
const bodyParser = require('body-parser');
const { Challenges, Assessment, Payment } = require("./models/index");
const { cronSchedulars } = require('./crons');
const { getCurrentDateAndTime } = require("./helpers/dates");
const { firebaseAdm } = require("./config/config");
const { sendMail } = require("./utils/appUtils")

app.use(cors());
app.use(cookieParser());
app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

app.use(express.urlencoded({ limit: "500mb", extended: true, parameterLimit: 5000000 }))
app.use(express.json({ limit: "500mb", extended: true, parameterLimit: 5000000 }))

app.get('/', async (req, res) => {
  res.send(`Welcome to the LIFE BACKEND ${environment} APPLICATION`)
})
app.use("/api", indexRouter);

//Scheduling the cron jobs
cronSchedulars();
app.listen(portNumber, async function () {
  console.log(getCurrentDateAndTime())
  await databaseConnection().then(async () => {
    console.log("Connect to MONGO-DB successfully");
  }).catch((e) => {
    "Unable to connect to MONGO-DB.Try again";
  });
  console.log(`Server started successfully on port ${portNumber}`);
});

module.exports = app;





















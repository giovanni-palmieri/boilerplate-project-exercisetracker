require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ExerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
});
const UserSchema = new mongoose.Schema({
  username: String,
});
const LogSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{ description: String, duration: Number, date: String }],
});

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);
const Log = mongoose.model("Log", LogSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", function (req, res) {
  const user = new User(req.body);

  user
    .save()
    .then((data) => {
      Log.findOneAndUpdate(
        {
          _id: data._id,
        },
        {
          $setOnInsert: {
            username: data.username,
            _id: data._id,
            count: 0,
            log: [],
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
        .exec()
        .then(() => res.send(data));
    })
    .catch((err) => res.status(500).send(err));
});

app.get("/api/users", function (req, res) {
  const users = User.find();

  users
    .exec()
    .then((data) => {
      res.send(data);
    })
    .catch((err) => res.status(500).send(err));
});

app.post("/api/users/:_id/exercises", function (req, res) {
  const _id = req.params._id;
  const { description, duration, date } = req.body;

  User.findById(_id)
    .exec()
    .then((user) => {
      const exercise = new Exercise({
        username: user.username,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });

      Log.findOneAndUpdate(
        {
          username: user.username,
        },
        {
          $setOnInsert: {
            username: user.username,
            _id: user._id,
          },
          $push: {
            log: {
              description: exercise.description,
              duration: exercise.duration,
              date: exercise.date,
              _id: exercise._id,
            },
          },
          $inc: { count: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
        .exec()
        .then(() => {
          exercise.save().then((exercise) => {
            const result = {
              _id: user._id,
              username: user.username,
              description: exercise.description,
              duration: exercise.duration,
              date: exercise.date,
            };
            res.send(result);
          });
        });
    });
});

app.get("/api/users/:_id/logs", function (req, res) {
  const _id = req.params._id;
  Log.findById(_id)
    .select({
      _id: true,
      count: true,
      log: true,
      username: true,
    })
    .exec()
    .then((logs) => {
      if (logs) {
        res.send(logs);
      } else {
        res.send({});
      }
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

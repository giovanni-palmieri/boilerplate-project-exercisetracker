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
  date: String,
});
const UserSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", function (req, res) {
  const user = new User(req.body);

  user
    .save()
    .then((data) => res.send(data))
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
        date: date ?? new Date().toISOString().substring(0, 10),
      });

      exercise.save().then((exercise) => {
        const result = {
          _id: user._id,
          username: user.username,
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString(),
        };
        res.send(result);
      });
    });
});

app.get("/api/users/:_id/logs", async function (req, res) {
  const _id = req.params._id;
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const to =
    req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  User.findById(_id)
    .exec()
    .then((user) =>
      Exercise.find({ username: user.username, date: { $gte: from, $lte: to } })
        .limit(limit)
        .exec()
        .then((exercises) => {
          res.send({
            username: user.username,
            count: exercises.length,
            _id: _id,
            log: exercises.map(({ description, duration, date }) => ({
              description,
              duration,
              date: new Date(date).toDateString(),
            })),
          });
        }),
    );
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

const express = require("express")
const app = express();
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config();
const UserModel = require("./UserModel.js");

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("hello world")
})

//inserting data 
app.post("/create", (req, res) => {
  UserModel.create(req.body)
    .then(user => res.json(user))
    .catch(err => res.status(500).json(err));
});

//getting data
app.get("/data", (req, res) => {
  UserModel.find()
  .then(user => res.json(user))
  .catch(err => res.json(err))
})

app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);
  res.status(500).json({ error: err.message });
});

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("mongodb connected"))
.catch(err => console.log(err))

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
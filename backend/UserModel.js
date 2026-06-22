const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    name: String,
    email: String,
    message: String
})

const UserModel = mongoose.model("vintusers", Schema)

module.exports = UserModel;
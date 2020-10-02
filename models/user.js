const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
	username: String,
	email: String,
	dateCrawled: Date
});

let User = mongoose.model('user',userSchema);

module.exports = User;
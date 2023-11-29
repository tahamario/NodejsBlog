const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userSchema = new schema({
    username : String,
    email: String,
    password: String
})

const UserModel = mongoose.model('users', userSchema)

// export the model
module.exports = UserModel; 
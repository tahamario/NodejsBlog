const mongoose = require('mongoose');
const schema = mongoose.Schema;

const postSchema = new schema({
    title: String,
    description: String,
    file: String,
    madeBy: String,
})

const PostModel = mongoose.model('posts', postSchema)

// export the model
module.exports = PostModel; 
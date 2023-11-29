const express = require('express'); // Express.js for building the web server
const dotenv = require('dotenv'); //dotenv for use .env file
const mongoose = require('mongoose'); // Mongoose for MongoDB object modeling
const cors = require('cors'); // CORS (Cross-Origin Resource Sharing) middleware
const bcrypt = require('bcrypt'); // Package for hashing or crypting passwords
const jwt = require('jsonwebtoken'); // JSON Web Token (JWT) for user authentication
const cookieParser = require('cookie-parser'); // Middleware to parse cookies

/* this two packages for upload files*/
const multer = require('multer'); // For handling file uploads
const path = require('path'); // For working with file paths
/* this two packages for upload files*/

// Import models
const UserModel = require('./models/UserSchema'); // User data model
const PostModel = require('./models/PostModel'); // Post data model

dotenv.config();
const port = process.env.PORT;
const dbCnx = process.env.DATABASE_CNX;
const jwtKey = process.env.JWT_SECRET_KEY;
const corsOrgin = process.env.CORS_URL;


const app = express()
app.use(express.json())

// CORS setup
app.use(cors({
    origin: [corsOrgin],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))

app.use(cookieParser())
app.use(express.static('public')); // Allow access to the public folder

// Connect to MongoDB
mongoose.connect(dbCnx, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware to verify user through JWT
const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ 'status': 401, 'message': 'The token is missing' });
    } else {
        jwt.verify(token, jwtKey, (err, decode) => {
            if (err) {
                return res.json({ 'status': 401, 'message': 'The token is wrong' });
            } else {
                req.email = decode.email;
                req.username = decode.username;
                next();
            }
        })
    }
}

app.get('/', verifyUser, (req, res) => {
    return res.json({ status: 200, message: 'The token is correct', email: req.email, username: req.username })
})

app.post('/register', (req, res) => {
    const { username, email, password } = req.body.registerData;
    UserModel.findOne({ email: email })
        .then((response) => {
            if (response) {
                res.json({ status: 401, 'message': 'This email already registred' })
            } else {
                bcrypt.hash(password, 10)
                    .then(hash => {
                        UserModel.create({ username, email, password: hash })
                            .then(user => res.json({ status: 200,user: user, message: 'you have been registred' }))
                            .catch(err => res.json({ status: 401, error: err, message: 'Technical register error try again later' }))
                    })
                    .catch(err => res.json({ status: 401, error: err, message: 'Technical register error try again later' }))
            }
        })
        .catch(err => res.json({ status: 401, error: err, message: 'Technical register error try again later' }))

})

app.post('/login', (req, res) => {
    UserModel.findOne({ email: req.body.loginData.email })
        .then((user) => {
            if (user) {
                bcrypt.compare(req.body.loginData.password, user.password, (err, response) => {
                    if (response) {
                        const token = jwt.sign({ email: user.email, username: user.username }, jwtKey, { expiresIn: '1d' })
                        res.cookie("token", token)
                        return res.json({ 'status': 200, 'message': 'Success' });
                    } else {
                        return res.json({ 'status': 401, 'message': 'Password is incorrect' });
                    }
                })
            } else {
                res.json({ 'status': 401, 'message': 'User not exist' });
            }
        })
})

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

app.post('/create', verifyUser, upload.single('file'), (req, res) => {

    PostModel.create({
        title: req.body.title,
        description: req.body.description,
        file: req.file.filename,
        madeBy: req.body.madeBy,
    })
        .then(result => res.json({ status: 200, message: 'Post created Successfully', data: result }))
        .catch(err => { res.json({ status: 401, error: err, message: 'Post create error' }) })
    // console.log(req.file)
    // return res.json({ status: 200, message: 'Logedout succesfuly'})
})

app.get('/getposts', (req, res) => {
    PostModel.find()
        .then(posts => res.json({ status: 200, data: posts, message: 'Posts successfully load' }))
        .catch((err) => { res.json({ status: 401, error: err, message: 'Posts error load' }) })
})

app.get('/getpostbyid/:id', (req, res) => {
    const id = req.params.id;
    PostModel.findById({ _id: id })
        .then(post => {
            if (post) {
                res.json({ status: 200, data: post, message: 'Post successfully load' })
            } else {
                res.json({ status: 401, message: 'Post not found' })
            }
        })
        .catch(err => { res.json({ status: 401, error: err, message: 'Post error load' }) })
})

app.put('/edit', verifyUser, upload.single('file'), (req, res) => {
    let data = {
        title: req.body.title,
        description: req.body.description,
    }

    if (req.file != undefined) {
        data = {
            title: req.body.title,
            description: req.body.description,
            file: req.file.filename,
        }
    }

    PostModel.findByIdAndUpdate(req.body.id, data)
        .then(result => res.json({ status: 200, message: 'Post edited Successfully', data: result }))
        .catch(err => res.json({ status: 401, error: err, message: 'Post error load' }))
})

app.delete('/delete/:id', verifyUser, (req, res) => {
    PostModel.findByIdAndDelete(req.params.id)
        .then(result => res.json({ status: 200, message: 'Post deleted Successfully', data: result }))
        .catch(err => res.json({ status: 401, error: err, message: 'Post delete error' }))
})

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({ status: 200, message: 'Logedout Successfully' })
})

// Start the server
app.listen(process.env.PORT  || port, () => {
    console.log('Server is running on port : ' + port)
})
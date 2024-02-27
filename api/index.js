const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const fs = require('fs');
const Post = require('./models/Post');

const app = express();
// Below used for encryption and decryption
const bcrypt = require('bcryptjs');
// Some random characters for encryption
const salt = bcrypt.genSaltSync(10);

// Below is the jsonwebtoken
const jwt = require('jsonwebtoken');
// Below is the random hashing string
const secret = 'aonb2987njignjn23n5ibbkbnka';

const cookieParser = require('cookie-parser');

// Using the multer package
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' })



app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// Password for my database cluster
// 2lMz71bQ1yy6X4Ww
// 2lMz71bQ1yy6X4Ww

// This below is my connection stream
// mongodb+srv://dhanyavg181:<password>@cluster0.4gk0ec4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// Put the above password inside the connection link in here.
// mongodb+srv://dhanyavg181:2lMz71bQ1yy6X4Ww@cluster0.4gk0ec4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// Connection with mongoose
mongoose.connect('mongodb+srv://dhanyavg181:2lMz71bQ1yy6X4Ww@cluster0.4gk0ec4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

app.post('/register', async (req, res) => {
     const { username, password } = req.body;
     try {
          const userDoc = await User.create({
               username,
               // encrypted password
               password: bcrypt.hashSync(password, salt),
          });
          res.json(userDoc);
     }
     catch (e) {
          res.status(400).json(e);
     }
});

app.post('/login', async (req, res) => {
     const { username, password } = req.body;
     const userDoc = await User.findOne({ username });
     // comparing the password entered with the entered password.
     const passOk = bcrypt.compareSync(password, userDoc.password);

     if (passOk) {
          //password is correct
          // Below returns a token or an error
          jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
               if (err) throw err;
               // res.cookie('token', token).json('ok');
               res.cookie('token', token).json(
                    {
                         id: userDoc._id,
                         username,
                    }
               );
          });
     }
     else {
          // Password or username is incorrect;
          res.status(400).json('wrong credentials');
     }
});

app.get('/profile', (req, res) => {
     // Veryify the token we are recieving by decrypting with secret. 
     // It is done to check if an user is logged in or not.
     const { token } = req.cookies;
     jwt.verify(token, secret, {}, (err, info) => {
          if (err) throw err;
          res.json(info);
     })
     
});

app.post('/logout', (req, res) => {
     res.cookie('token', '').json('ok');
})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
     const { originalname, path } = req.file;
     const parts = originalname.split('.');
     const ext = parts[parts.length - 1];
     const newPath = path + '.' + ext;
     fs.renameSync(path, newPath);

     const { token } = req.cookies;
     jwt.verify(token, secret, {}, async (err, info) => {
          if (err) throw err;

          const { title, summary, content } = req.body;

          const postDoc = await Post.create({
               title,
               summary,
               content,
               cover: newPath,
               author: info.id,
          })
          res.json(postDoc);
     })
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
     let newPath = null;
     if (req.file) {
          const { originalname, path } = req.file;
          const parts = originalname.split('.');
          const ext = parts[parts.length - 1];
          newPath = path + '.' + ext;
          fs.renameSync(path, newPath);

     }
     const { token } = req.cookies;

     jwt.verify(token, secret, {}, async (err, info) => {
          if (err) throw err;
          const { id, title, summary, content } = req.body;
          const postDoc = await Post.findById(id);

          const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
          if (!isAuthor) {
               return res.status(400).json('you are not the author');
               
          }
          await postDoc.updateOne({
               title,
               summary,
               content,
               cover: newPath ? newPath : postDoc.cover,
          });
          
          res.json(postDoc);
     })
})

app.get('/post', async (req, res) => {
     res.json(await Post.find()
          .populate('author', ['username'])
          .sort({ createdAt: -1 })
          .limit(20)
     );

})

app.get('/post/:id', async (req, res) => {
     const { id } = req.params;
     const postDoc = await Post.findById(id).populate('author', ['username']);
     res.json(postDoc);
})

app.listen(4000);


const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json());
const User = require("./models/User");
const Post = require("./models/Post");
app.use("/uploads", express.static(__dirname + "/uploads"));

// Below we are using something called json webtoken
const jwt = require("jsonwebtoken");
// below secret is aome random string
const secret = "doapnjgkpasckl";

// below we are installing cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Below we are installing the multer.
// It is used to work with the uploading of files.
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });

// First install cors using npm before using the below line
const cors = require("cors");
app.use(cors({ credentials: true, origin: "http://localhost:4000/" }));

const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://dhanyavg181:hll3kubLABlTgAws@cluster0.wdubjdi.mongodb.net/?retryWrites=true&w=majority"
);

// Go to google and search bcrypt npm in searchbox and refer to the documentation
// THis is used to decrypt the password.
const bcrypt = require("bcrypt");
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

app.post("/register", async (req, res) => {
  // We are getting the entered username and password at the time of registering by below line.
  const { username, password } = req.body;
  try {
    const UserDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });

    res.json(UserDoc);
  } catch (e) {
    res.status(400).json(e);
    console.log("there is an error");
  }
});

app.post("/login", async (req, res) => {
  // We are getting the entered username and password at the time of registering by below line.
  const { username, password } = req.body;
  try {
    const UserDoc = await User.findOne({
      username,
    });
    // We are checking if the password entered is the same as the specified username's password.
    const passvalid = bcrypt.compareSync(password, UserDoc.password);

    // So, we can see in the network section of the res.json, if its true, then the password matches or else not.
    if (passvalid) {
      // Logged in
      //  we can get error or the token
      jwt.sign({ username, id: UserDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie("token", token).json({
          id: UserDoc._id,
          username,
        });
      });
    } else {
      res.status(400).json("wrong credentials");
    }
  } catch (e) {
    res.status(400).json(e);
    console.log("there is an error");
  }
});

// We are sending res.json(info) to the /profile.
app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  // after the below code we can see the username in network/profile/previeew
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      throw err;
    }
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  // When we logged in we were setting the token to the token obtained.
  // Now, we are setting it to empty string
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  // The original filename will be something like screenshot234.png
  const { originalname, path } = req.file;
  // parts will be an array of substrings which is obtained by splitting the string by '.'
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  // So ext = "png"
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);
  // Now we can check the uploads, where we got the png file
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      throw err;
    }

    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json({ postDoc });
  });
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      throw err;
    }
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      throw "You are not the author";
    }
    
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json({ postDoc });
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(4000);

// Password
// hll3kubLABlTgAws

// Connection
// mongodb+srv://dhanyavg181:<hll3kubLABlTgAws>@cluster0.wdubjdi.mongodb.net/?retryWrites=true&w=majority

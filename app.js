//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(session({
    secret: "Out little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//const secret = process.env.SECRET;

//userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.route("/")
    .get(function (req, res) {
        res.render("home");
    });

app.route("/auth/google")
    .get(function (req, res){
    passport.authenticate("google", {scope: ["profile"]});
    });

app.route("/auth/google/secrets")
    .get(passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
    });

app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {

        // const username = req.body.username;
        // const password = req.body.password;
        //
        // User.findOne({email: username}, function (err, foundUser) {
        //
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         // if (foundUser) {
        //             if (foundUser.password === password){
        //                 res.render("secrets");
        //             }
        //        // }
        //     }
        // });
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function (err) {
            if(err){
                console.log(err);
            } else{
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");

                })
            }
        })
    });

app.route("/secrets")
    .get(function (req, res) {
    if(req.isAuthenticated()){
        res.render("secrets");
    } else{
        res.redirect("/login");
    }
});

app.route("/logout")
    .get(function (req, res) {
        req.logout();
        res.redirect("/");
    });

app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })
    .post(function (req, res) {
        // let user = new User({
        //     email: req.body.username,
        //     password: req.body.password
        // });
        // user.save(function (err) {
        //     if (!err) {
        //         res.render("secrets");
        //     } else {
        //         res.send(err);
        //     }
        // });
        User.register({username: req.body.username}, req.body.password, function (err, user) {
            if(err){
                console.log(err);
                res.redirect("/register");
            }  else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                })
            }
        })
    });

app.listen(3000, function () {
    console.log("The server is started!");
});
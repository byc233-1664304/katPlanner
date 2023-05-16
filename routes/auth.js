const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
    let authContent = "<form id=\"loginForm\"><div>";
    authContent += "<div><label for=\"loginEmail\">email: </label>";
    authContent += "<input type=\"email\" name=\"loginEmail\" id=\"loginEmail\" required></div>";
    authContent += "<div><label for=\"loginPassword\">password: </label>";
    authContent += "<input type=\"password\" name=\"password\" id=\"loginPassword\" required></div></div>";
    authContent += "<button type=\"submit\" id=\"loginbutton\">Sign In</button></form>";
    authContent += "<p>Don't have an account?<br><a href=\"/auth/register\">Register here!</a></p>";

    let loginContent = {
        authContent: authContent
    }

    res.render("auth", loginContent);
});

router.get("/register", (req, res) => {
    let authContent = "<form id=\"registerForm\"><div>";
    authContent += "<div><label for=\"username\">username: </label>";
    authContent += "<div><input type=\"text\" name=\"username\" id=\"username\" required></div></div>";
    authContent += "<div><label for=\"registerEmail\">email: </label>";
    authContent += "<div><input type=\"email\" name=\"registerEmail\" id=\"registerEmail\" required></div></div>";
    authContent += "<div><label for=\"registerPassword\">password: </label>";
    authContent += "<div><input type=\"password\" name=\"registerPassword\" id=\"registerPassword\" required></div></div>";
    authContent += "<div><label for=\"registerPasswordConfirmation\">confirm<br>password: </label>";
    authContent += "<div><input type=\"password\" name=\"registerPasswordConfirmation\" id=\"registerPasswordConfirmation\" required></div>";
    authContent += "</div></div>";
    authContent += "<button type=\"submit\" id=\"registerbutton\">Sign Up</button></form>";
    authContent += "<p>Already have an account?<br><a href=\"/auth/login\">Sign in here!</a></p>";

    let registerContent = {
        authContent: authContent
    }

    res.render("auth", registerContent);
});

module.exports = router;
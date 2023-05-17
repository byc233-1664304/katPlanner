const process = require("process");

if(process.argv.length === 2 || process.argv.length === 3) {
    // utilities
    const http = require("http");
    const path = require("path");
    const bodyParser = require("body-parser");
    const readline = require("readline");
    const cookieParser = require("cookie-parser");
    const crypto = require("crypto");
    const axios = require("axios");

    // database related
    require("dotenv").config();

    const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
    const userName = process.env.MONGO_DB_USERNAME;
    const password = process.env.MONGO_DB_PASSWORD;

    const { MongoClient, ServerApiVersion } = require('mongodb');
    const uri = `mongodb+srv://${userName}:${password}@kattail.xszi3jt.mongodb.net/?retryWrites=true&w=majority`;
    let client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    //express app related
    const express = require("express");
    const app = express();
    const portNumber = process.argv[2] ? process.argv[2] : 4000;

    // login page content
    let loginContent = "<form id=\"loginForm\" method=\"post\" action=\"/login\"><div>";
    loginContent += "<div><label for=\"loginEmail\">email: </label>";
    loginContent += "<input type=\"email\" name=\"loginEmail\" id=\"loginEmail\" required></div>";
    loginContent += "<div><label for=\"loginPassword\">password: </label>";
    loginContent += "<input type=\"password\" name=\"loginPassword\" id=\"loginPassword\" required></div></div>";
    loginContent += "<button type=\"submit\" id=\"loginbutton\">Sign In</button></form>";
    loginContent += "<p>Don't have an account?<br><a href=\"/register\">Register here!</a></p>";

    // register page content
    let registerContent = "<form id=\"registerForm\" method=\"post\" action=\"/register\"><div>";
    registerContent += "<div><label for=\"username\">username: </label>";
    registerContent += "<div><input type=\"text\" name=\"username\" id=\"username\" required></div></div>";
    registerContent += "<div><label for=\"registerEmail\">email: </label>";
    registerContent += "<div><input type=\"email\" name=\"registerEmail\" id=\"registerEmail\" required></div></div>";
    registerContent += "<div><label for=\"registerPassword\">password: </label>";
    registerContent += "<div><input type=\"password\" name=\"registerPassword\" id=\"registerPassword\" required></div></div>";
    registerContent += "<div><label for=\"registerPasswordConfirmation\">confirm<br>password: </label>";
    registerContent += "<div><input type=\"password\" name=\"registerPasswordConfirmation\" id=\"registerPasswordConfirmation\" required></div>";
    registerContent += "</div></div>";
    registerContent += "<button type=\"submit\" id=\"registerbutton\">Sign Up</button></form>";
    registerContent += "<p>Already have an account?<br><a href=\"/login\">Sign in here!</a></p>";

    app.set("views", path.resolve(__dirname, "templates"));
    app.set("view engine", "ejs");

    app.use(express.static(path.resolve(__dirname, "public")));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({extended:false}));

    // the app
    app.get("/", async (req, res) => {
        const emailCookie = req.cookies.katPlannerEmail;
        const passwordHashCookie = req.cookies.katPlannerPasswordHash;

        if (emailCookie && passwordHashCookie) {
            const isAuthenticated = await authenticate(emailCookie, passwordHashCookie);
        
            if (isAuthenticated) {
                res.redirect(200, "/planner");
            }else {
                res.render("index");
            }
        }else {
            res.render("index");
        }
    });

    app.get("/login", (req, res) => {
        res.render("auth", { authContent: loginContent, alertMessage: "" });
    });

    app.post("/login", async (req, res) => {
        let loginEmail = req.body.loginEmail;
        let loginPassword = req.body.loginPassword;

        const user = await retrieveUserData(loginEmail);

        if(user) {
            let hash = crypto.pbkdf2Sync(loginPassword, user.salt, 1000, 64, `sha512`).toString(`hex`);
            const passwordCorrect = await authenticate(loginEmail, hash)
            
            if(passwordCorrect){
                res.cookie("katPlannerEmail", loginEmail, { httpOnly: true });
                res.cookie("katPlannerPasswordHash", hash, { httpOnly: true });
                res.redirect(200, "/planner");
            }else {
                res.render("auth", { authContent: loginContent, alertMessage: "Wrong password" });
            }
        }else {
            res.render("auth", { authContent: loginContent, alertMessage: "User not found" });
        }
    });

    app.get("/register", (req, res) => {
        res.render("auth", { authContent: registerContent, alertMessage: "" });
    });

    app.post("/register", async (req, res) => {
        let registerPassword = req.body.registerPassword;
        let registerPasswordConfirmation = req.body.registerPasswordConfirmation;

        if(registerPassword !== registerPasswordConfirmation) {
            res.render("auth", { authContent: registerContent,
                                    alertMessage: "Password and its confirmation don't match" });
        }else {
            let username = req.body.username;
            let registerEmail = req.body.registerEmail;
            let salt = crypto.randomBytes(16).toString('hex');

            let user = {
                username: username,
                email: registerEmail,
                // Create a unique salt for a particular user
                salt: salt,
                // Hash user's salt and password with 1000 iterations,
                // 64 length and sha512 digest
                hash: crypto.pbkdf2Sync(registerPassword, salt, 1000, 64, `sha512`).toString(`hex`),
                events: ""
            }
    
            await addUser(user);
            res.redirect(200, "/login");
        }
    });

    app.get("/planner", async (req, res) => {
        const emailCookie = req.cookies.katPlannerEmail;
        const user = await retrieveUserData(emailCookie);
        
        let tempVariables = {
            username: user.username,
            event: user.event
        }
        res.render("planner", tempVariables);
    });

    app.post("/", (req, res) => {
        res.clearCookie("katPlannerEmail");
        res.clearCookie("katPlannerPasswordHash");
        res.redirect(200, "/");
    });

    app.post("/planner", async (req, res) => {
        const emailCookie = req.cookies.katPlannerEmail;
        const todo = req.body.todo;
        await updateEvent(emailCookie, todo);
    });

    // functions
    function askStop(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(query, async ans => {
            rl.close();
            if(ans === "stop") {
                console.log("Shutting down the server");
                await closeDatabaseConnection();
                process.exit(0);
            }else {
                console.log(`Invalid command: ${ans}`);
                askStop(query);
            }
        }));
    }

    async function connectToDatabase() {
        try {
          await client.connect();
        } catch (e) {
          console.error(e);
        }
    }

    async function closeDatabaseConnection() {
        try {
          await client.close();
          console.log("Database connection closed")
        } catch (e) {
          console.error(e);
        }
      }    

    async function authenticate(email, hash) {
        try{
            await client.connect();
            let authFilter = {email: email};
            const res = await client.db(databaseAndCollection.db)
                                    .collection(databaseAndCollection.collection)
                                    .findOne(authFilter);

            if(hash === res.hash) {
                return true;
            }else {
                return false;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function addUser(user) {
        try{
            await client.connect();
            await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(user);
        } catch (e) {
            console.error(e);
        }
    }

    async function retrieveUserData(email) {
        try{
            await client.connect();
            let loginFilter = {email: email};
            const user = await client.db(databaseAndCollection.db)
                                    .collection(databaseAndCollection.collection)
                                    .findOne(loginFilter);
            return user;
        } catch (e) {
            console.error(e);
        }
    }

    async function updateEvent(email, event) {
        try{
            await client.connect();
            let updateFilter = {email: email};
            let update = { $set: { event: event} };
            const res = await client.db(databaseAndCollection.db)
                                    .collection(databaseAndCollection.collection)
                                    .updateOne(updateFilter, update);
        }catch (e) {
            console.error(e);
        }
    }

    async function getLocation() {
        const options = {
            method: 'GET',
            url: 'https://find-any-ip-address-or-domain-location-world-wide.p.rapidapi.com/iplocation',
            params: {
              apikey: '873dbe322aea47f89dcf729dcc8f60e8'
            },
            headers: {
              'X-RapidAPI-Key': '8afe6968f9mshb5ffa7075084d5dp137056jsn35054d2c693e',
              'X-RapidAPI-Host': 'find-any-ip-address-or-domain-location-world-wide.p.rapidapi.com'
            }
        };

        let data = await axios.request(options);
        console.log(data);
    }

    app.listen(portNumber, async (err) => {
        if (err) {
            console.log("Failed to start the server with error message: " + err);
        } else {
            console.log(`Web server started and running at http://localhost:${portNumber}`);
            await connectToDatabase();

            process.on("exit", () => {
                closeDatabaseConnection();
            });

            askStop("Enter \"stop\" to shotdown the server: ");
        }
    });
}else {
    console.log("Usage app.js portNumber(optional)");
    console.log("The default port number is 4000");
}
const process = require("process");

if(process.argv.length === 2 || process.argv.length === 3) {
    // utilities
    const http = require("http");
    const path = require("path");
    const bodyParser = require("body-parser");
    const readline = require("readline");
    const cookieParser = require("cookie-parser");

    // routers part 1
    const auth = require("./routes/auth");

    //express app related
    const express = require("express");
    const app = express();
    const router = express.Router();
    const portNumber = process.argv[2] ? process.argv[2] : 4000;

    app.set("views", path.resolve(__dirname, "templates"));
    app.set("view engine", "ejs");

    app.use(express.static(path.resolve(__dirname, "public")));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({extended:false}));

    //routers part 2
    app.use("/auth", auth);

    // the app
    app.get("/", (req, res) => {
        let email = req.cookies.katPlannerEmail;
        let password = req.cookies.katPlannerPassword;

        if(email !== undefined && password !== undefined) {
            // TODO: email and password matched data
            res.redirect(200, "/planner");
        }else {
            res.render("index");
        }
    });

    app.get("/planner", (req, res) => {
        res.render("planner");
    });

    // functions
    function askStop(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            if(ans === "stop") {
                console.log("Shutting down the server");
                process.exit(0);
            }
        }));
    }

    app.listen(portNumber, (err) => {
        if(err) {
            console.log("Failed to start the server with error message: " + err);
        } else {
            console.log(`Web server started and running at http://localhost:${portNumber}`);
        }
    });
    askStop("Enter \"stop\" to shotdown the server: ");
}else {
    console.log("Usage app.js portNumber(optional)");
    console.log("The default port number is 4000");
}
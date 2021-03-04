const express = require("express") ;
const PORT = process.env.PORT || 3000 ;
const app = express() ; 
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const TodoTask = require("./models/TodoTask");
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'logindatabase'
});

//middleware
app.use("/static", express.static("public"))
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.urlencoded({ extended: true }));
//login
app.get('/login',checkAuth, function(req, res) {
	res.sendFile(path.join(__dirname + '/views/login.html'));
});
app.get("/auth",checkAuth,(req,res)=>{
    res.redirect("/")
})
app.post('/auth', checkAuth,function(req, res) {
	let username = req.body.username;
	let password = req.body.password;
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(err, results) {
            if(err)throw err
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/');
			} else {
                res.sendFile(path.join(__dirname + '/views/incorrect.html'));
			}			
		});
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	}
});

//connect mongodb
mongoose.set("useFindAndModify", false);
mongoose.connect(process.env.DB_CONNECT, { useNewUrlParser: true }, () => {
console.log("Connected to db!");
});


app.get("/", checkLogin,(req, res) => {
    TodoTask.find({}, (err, tasks) => {
        res.render("todo.ejs", { todoTasks: tasks });
    });
});    
app.get("/register",checkAuth,(req,res)=>{
    res.sendFile(path.join(__dirname + '/views/register.html'));
})
    
//post
app.post('/',async (req, res) => {
    const todoTask = new TodoTask({
        content: req.body.content
    });
    try {
        await todoTask.save();
        res.redirect("/");
    } catch (err) {
        res.redirect("/");
    }
});  
app.post("/register",(req,res)=>{
    var accounts={
        "id": uuidv4 ,
        "username":req.body.username,
        "password":req.body.password
      }
     
     connection.query('INSERT INTO accounts SET ?',accounts, function (error, results, fields) {
       if (error) {
           console.log(error)
         res.send({
           "code":400,
           "failed":"error ocurred"
         })
       } else {
         res.redirect("/");
         }
     });
})
//update
app
    .route("/edit/:id")
    .get((req, res) => {
        const id = req.params.id;
        TodoTask.find({}, (err, tasks) => {
            res.render("todoEdit.ejs", { todoTasks: tasks, idTask: id });
        });
    })
    .post((req, res) => {
        const id = req.params.id;

        TodoTask.findByIdAndUpdate(id, { content: req.body.content }, err => {
            if (err) return res.send(500, err);
            res.redirect("/");
        });
    });
    //delete
    app.route("/remove/:id").get((req, res) => {
        const id = req.params.id;
        TodoTask.findByIdAndRemove(id, err => {
            if (err) return res.send(500, err);
                res.redirect("/");
        });
    });

    function checkAuth(req,res,next){
        if(req.session.username){
            res.redirect("/")
        } else{
            next();
        }
    }    
    function checkLogin(req,res,next){
        if(!req.session.username){
            res.redirect("/login")
         } else{
             next();
        }
    }
    function NoCheckLogin(req,res,next){
        if(req.session.username){
            res.redirect("/login")
        } else{
            next();
        }
    }

    app.listen(3000, () => {
        console.log(`listening on...${PORT}`)
})


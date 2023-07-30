import dotenv from "dotenv";
dotenv.config({});
import express from "express";
import {google} from "googleapis";
import dayjs from "dayjs";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const calendar=google.calendar({
    version:"v3",
    auth:process.env.API_KEY,
})
const app = express();
app.use(cors());
app.use(express.json());
const PORT=process.env.NODE_ENV || 8000
const oauth2Client=new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
)
const scopes=[
    'https://www.googleapis.com/auth/calendar'
]
app.get("/google",(req,res) =>{
     const url=oauth2Client.generateAuthUrl({
        access_type:"offline",
        scope:scopes
     });    
     res.redirect(url);
})
app.get('/google/redirect',async(req,res) =>{
     const code=req.query.code;
    const { tokens } =await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log(req.query);
    res.send({
        msg:"you have successfully logged in",
    });
});
app.post('/schedule_event',async(req,res) =>{
    try{
    const {summary,description}=req.body;
     console.log(oauth2Client.credentials.access_token)
    /* console.log(oauth2Client.setCredentials({access_token:access_token})) */
     const response=await calendar.events.insert({
        calendarId :"primary",
        auth:oauth2Client,
        requestBody :{
            summary:/* "This is a test event" */summary,
            description:/* "some event that is very very important" */description,
            start:{
               dateTime:dayjs(new Date()).add(1,'hour').toISOString(),
               timeZone:"Asia/Kolkata",
                
            },
            end:{
                dateTime:dayjs(new Date()).add(1,"day").add(1,"hour").toISOString(),
                timeZone:"Asia/Kolkata"
            }
        },
     });
/*      res.send({
        msg:"Done",
     }) */
     res.send(response)
    }
    catch(e){
        console.log(e);
    }
});
const JWT_SECRET="shoiwopak;lQAhkdnsksjshgssososmbfdqeqtwu";
const mongoUrl = "mongodb+srv://vishalsair2005:Hu8pRA8HJS7vbYhe@cluster0.hf46ait.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(mongoUrl,{
    useNewUrlParser:true,
})
.then(() =>{
    console.log("connected to database");
})
.catch((e)=>console.log(e));
const UserDetailsSchema=new mongoose.Schema(
    {
        fname:String,
        lname:String,
        email:{type: String,unique:true},
        password:String,
        
    },
    {
        collection:"UserInfo"
    }
);
mongoose.model("UserInfo",UserDetailsSchema);
const AssignmentSchema=new mongoose.Schema({
    email:String,
    assignment_name:String,
    duedate:String,
    course:String
},{
    collection:"AssignmentInfo"
});
mongoose.model("AssignmentInfo",AssignmentSchema);
const User=mongoose.model("UserInfo");
const Assignment=mongoose.model("AssignmentInfo"); 
app.post("/register",async(req,res) =>{
    const {fname,lname,email,password} =req.body;
    const encryptedPassword=await bcrypt.hash(password,10)
    try{
        const oldUser =await User.findOne({ email });

        if(oldUser){
            return res.send({error:"User Exists"})
        }
       await User.create({
        fname,
        lname,
        email,
        password:encryptedPassword
       });
       res.send({status:"ok"})
    }
    catch(error){
       res.send({status:"error"})
    }
})
app.post("/login-user",async(req,res) =>{
    const {email,password}=req.body;
    const user=await User.findOne({email});
    if(!user){
        return res.json({error:"User not found"})
    }
    if(await bcrypt.compare(password,user.password))
    {
        /* const token=jwt.sign({email:user.email},JWT_SECRET) */

        if( res.status(201)){
            return res.json({status:"ok"/* ,data:token */})
        }else{
            return res.json({status:"error"})
        }
    }
    res.json({status:"error",error:"invaid password"})
})
app.post("/userDetails",async(req,res) =>{
    const{email,assignment_name,duedate,course}=req.body;
    const user=await User.findOne({email});
    try{
        await Assignment.create({
            email,
            assignment_name, 
            duedate,
            course
        })
        const token=jwt.sign({email:user.email},JWT_SECRET)
        if(res.status(201)){

            return res.json({status:"ok",data:token})
        }
    }
    catch(e){
        res.send({status:"error"});
    }
       
})
app.post("/Assignmentone",async(req,res) =>{
    const {token}=req.body;
    try{
        const user=jwt.verify(token,JWT_SECRET);
        console.log(user);
        const useremail=user.email;
        Assignment.findOne({email:useremail})
        .then((data) =>{
            res.send({status:"ok",data:data})
        })
        .catch((error) =>{
            res.send({status:"error",data:error})
        })
    }
    catch(error){

    }
})
app.listen(PORT,() =>{
    console.log("server started on port",PORT)
})
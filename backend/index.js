import express, { response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
dotenv.config()

import connectDB from './config/connectDB.js';
import userRouter from './route/user.route.js';

const app =express()
//Middleware Setup
app.use (cors({
    credentials:true,
    origin :process.env.FRONTEND_URL  //Restricts access only to the frontend
}))
app.use(express.json())  //request to the response to json
app.use(cookieParser())  
app.use(morgan('dev')) // Logs HTTP requests for debugging and monitoring.
app.use(helmet({  
    crossOriginEmbedderPolicy: false
}))
const PORT =  process.env.PORT || 8080;

//app routers
app.get("/",(request,response)=>{
    //Server to client side
    response.json({
        message : "Server is running 8080"
    })
})


//thi API call for the server connect
app.use('/api/user',userRouter)

connectDB().then(()=>{
    app.listen(PORT,()=>{
        console.log("Server is running ",PORT)
    })
});



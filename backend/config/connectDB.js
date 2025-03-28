//connect the database
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config()

if (!process.env.MONGODB_URL){
    throw new Error (
        "Please provide MONGODB_URL in the .env file"
    )
}

const connectDB= async() =>{
    try{
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("Connect DB Sucessfully")

    }catch(error){
        console.log("Monodb connect error",error)
        process.exit(1)  // stop the server
    }
}


export default connectDB;
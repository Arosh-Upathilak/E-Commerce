import UserModel from "../models/user.model.js";
import bcryptjs from 'bcryptjs';
import sendEmail from "../config/sendEmail.js";
import verifyEmailTemplate from "../utils/verifyEmailTemplate.js";
import dotenv from 'dotenv';
import generatedAcessToken from "../utils/generatedAcessToken.js";
import generatedRfreshToken from "../utils/generatedRefreshToken.js";

dotenv.config();

export async function registerUserController(request,response){ 
    try{
        const {name,email,password}=request.body
        if(!name || !email ||!password){
            return response.status(400).json({
                message: "provide email,name,password ",
                error: true,
                success: false
            })
        }

        /*check the email was exixt when exits then return the email 
        otherwise none*/
        const user = await UserModel.findOne({email})

        if (user){
            return response.json({
                message: "Already register email",
                error: true,
                success : false
            })
        }
        //password conver the hash
        const salt =await bcryptjs.genSalt(10)
        const hashPassword =await bcryptjs.hash(password,salt)

        //store in database
        const payload ={
            name,
            email,
            password : hashPassword
        }
        const newUser =new UserModel(payload)
        const save =await newUser.save()


        //create a verification mail
        const VerificationURL = `${process.env.FRONTEND_URL}/verify-email?code=${save._id}`  //frontend URL

        const verificationEmail =await sendEmail({
            sendTo:email,
            subject:"Verify email from e-commernce",
            html : verifyEmailTemplate ({
                name,
                url: VerificationURL
            })
        })

        return response.json({
            message: "User register successfully",
            error:false,
            success:true,
            data:save
        })
        
    }catch(error){
        return response.status(500).json({
            message: error.message || error,
            error :true,
            success:false
        })
    }
}

export async function verificationEmailController(request,response){
    try{
        const {code} =request.body

        const user =await UserModel.findOne({_id:code})

        if(!user){
            return response.status(400).json({
                message: "Invalid code",
                error: true,
                success :false
            })
        }

        const updateUser =await UserModel.updateOne({_id: code},{
            verify_email:true
        })

        return response.json({
            message : "Verify the Email Sucess",
            success :true,
            error:false
        })

    }catch(error){
        return response.status(500).json({
            message:error.message||error,
            error:true,
            success:true
        })
    }
}

//login controller

export async function loginController(request,response) {
    try{

        const {email,password} =request.body

        const user =await UserModel.findOne({email})
        if (!user){
            return response.status(400).json({
                message:"User not register",
                error:true,
                success:false
            })
        }

        if (!email||!password){
            return response.status(400).json({
                message:"provide email and password",
                error:true,
                success:false
            })
        }

        if(user.status!=="Active"){
            return response.status(400).json({
                message:"Contact to admin ",
                error:true,
                success:false
            })
        }

        const checkPassword =await bcryptjs.compare(password,user.password)

        if(!checkPassword){
            return response.status(400).json({
                message:"Check your password ",
                error:true,
                success:false
            })
        }


        //access token -directly use for the login
        const accesstoken = await generatedAcessToken(user._id)

        //refress token -incerese a lifespan of access token
        const refreshtoken = await generatedRfreshToken(user._id)
        
        const cookieOption ={
            httpOnly :true,
            secure : true,
            sameSite :"None"
        }

        response.cookie('accessToken',accesstoken,cookieOption)
        response.cookie('refreshToken',refreshtoken,cookieOption)

        return response.status(200).json({
            message: "login Sucess",
            error:false,
            success : true,
            DataTransfer :{
                accesstoken,refreshtoken
            }
        })


    }catch(error){
        return response.status(500).json({
            message: error.message||error,
            error:true,
            success: false
        })
    }
    
}


export async function logoutController(request,response){
    try{

        const cookieOption ={
            httpOnly :true,
            secure : true,
            sameSite :"None"
        }
        
        response.clearCookie("accessToken",cookieOption)
        response.clearCookie("refreshToken",cookieOption)

        //remove from the DB


        return response.status(200).json({
            message:"Logout Sucessfully",
            success:true,
            error:false
        })




    }catch(error){
        return response.status(500).json({
            message: error.message||error,
            error:true,
            success: false
        })
    }
}
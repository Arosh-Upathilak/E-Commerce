import UserModel from "../models/user.model.js";
import bcryptjs from 'bcryptjs';
import sendEmail from "../config/sendEmail.js";
import verifyEmailTemplate from "../utils/verifyEmailTemplate.js";
import dotenv from 'dotenv';
import generatedAcessToken from "../utils/generatedAcessToken.js";
import generatedRfreshToken from "../utils/generatedRefreshToken.js";
import uploadImageClodinary from "../utils/uploadImageClodinary.js";
import generatedOtp from "../utils/generatedOtp.js";
import forgotPasswordTemplate from "../utils/forgotPasswordTemplate.js";
import jwt from 'jsonwebtoken';
import generatedAccessToken from "../utils/generatedAcessToken.js"
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
        const userid = request.userId  //middelwares

        const cookieOption ={
            httpOnly :true,
            secure : true,
            sameSite :"None"
        }
        
        response.clearCookie("accessToken",cookieOption)
        response.clearCookie("refreshToken",cookieOption)

        //remove from the DB
        const removeRefreshToken =await UserModel.findByIdAndUpdate(userid,{
            refresh_token:" "
        })

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

export async  function uploadAvatar(request,response){
    try {
        const userId = request.userId // auth middlware
        const image = request.file  // multer middleware


        //console.log('image',image)
        const upload = await uploadImageClodinary(image)
        
        const updateUser = await UserModel.findByIdAndUpdate(userId,{
            avatar : upload.url
        })

        return response.json({
            message : "upload profile",
            success : true,
            error : false,
            data : {
                _id : userId,
                avatar : upload.url
            }
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}


//update user details
export async function updateUserDetails(request,response){
    try {
        const userId = request.userId //auth middleware
        const { name, email, mobile, password } = request.body 

        let hashPassword = ""

        if(password){
            const salt = await bcryptjs.genSalt(10)
            hashPassword = await bcryptjs.hash(password,salt)
        }
                                        //findOneandOupdate  use for the previoes thing updated
        const updateUser = await UserModel.updateOne({ _id : userId},{
            ...(name && { name : name }),
            ...(email && { email : email }),
            ...(mobile && { mobile : mobile }),
            ...(password && { password : hashPassword })
        })

        return response.json({
            message : "Updated successfully",
            error : false,
            success : true,
            data : updateUser
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}


//forgot password not login
export async function forgotPasswordController(request,response) {
    try {
        const { email } = request.body 

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const otp = generatedOtp()   //ms 
        const expireTime = new Date() + 60 * 60 * 1000 // 1hr

        const update = await UserModel.findByIdAndUpdate(user._id,{
            forgot_password_otp : otp,
            forgot_password_expiry : new Date(expireTime).toISOString()
        })

        await sendEmail({
            sendTo : email,
            subject : "Forgot password from Binkeyit",
            html : forgotPasswordTemplate({
                name : user.name,
                otp : otp
            })
        })

        return response.json({
            message : "check your email",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}


//verify forgot password otp
export async function verifyForgotPasswordOtp(request,response){
    try {
        const { email , otp }  = request.body

        if(!email || !otp){
            return response.status(400).json({
                message : "Provide required field email, otp.",
                error : true,
                success : false
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const currentTime = new Date().toISOString()

        if(user.forgot_password_expiry < currentTime  ){
            return response.status(400).json({
                message : "Otp is expired",
                error : true,
                success : false
            })
        }

        if(otp !== user.forgot_password_otp){
            return response.status(400).json({
                message : "Invalid otp",
                error : true,
                success : false
            })
        }

        //if otp is not expired
        //otp === user.forgot_password_otp

        const updateUser = await UserModel.findByIdAndUpdate(user?._id,{
            forgot_password_otp : "",
            forgot_password_expiry : ""
        })
        
        return response.json({
            message : "Verify otp successfully",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//accoding to the image i added to the word afther the otp match sucess fo go to the reset password
//reset the password
export async function resetpassword(request,response){
    try {
        const { email , newPassword, confirmPassword } = request.body 

        if(!email || !newPassword || !confirmPassword){
            return response.status(400).json({
                message : "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email is not available",
                error : true,
                success : false
            })
        }

        if(newPassword !== confirmPassword){
            return response.status(400).json({
                message : "newPassword and confirmPassword must be same.",
                error : true,
                success : false,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword,salt)

        const update = await UserModel.findOneAndUpdate(user._id,{
            password : hashPassword
        })

        return response.json({
            message : "Password updated successfully.",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//refresh token controler (create new token)
export async function refreshToken(request,response){
    try {
        const refreshToken = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1]  /// [ Bearer token]

        if(!refreshToken){
            return response.status(401).json({
                message : "Invalid token",
                error  : true,
                success : false
            })
        }
        //console.log('refresh Tokene',refreshToken)
        const verifyToken = await jwt.verify(refreshToken,process.env.SECRET_KEY_REFRESH_TOKEN)

        if(!verifyToken){
            return response.status(401).json({
                message : "token is expired",
                error : true,
                success : false
            })
        }

        const userId = verifyToken?._id

        const newAccessToken = await generatedAccessToken(userId)

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"  //backend and front end run differnt website
        }

        response.cookie('accessToken',newAccessToken,cookiesOption)

        return response.json({
            message : "New Access token generated",
            error : false,
            success : true,
            data : {
                accessToken : newAccessToken
            }
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//get login user details
export async function userDetails(request,response){
    try {
        const userId  = request.userId

        console.log(userId)

        const user = await UserModel.findById(userId).select('-password -refresh_token')

        return response.json({
            message : 'user details',
            data : user,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : "Something is wrong",
            error : true,
            success : false
        })
    }
}
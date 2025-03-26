import UserModel from "../models/user.model.js";
import bcryptjs from 'bcryptjs'


 export const registerUserController = async (request,response)=>{
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

    }catch(error){
        return response.status(500).json({
            message: error.message || error,
            error :true,
            success:false
        })
    }
}


// require('dotenv').config()
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./env'
});

connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running on port ${process.env.PORT || 8000}`);
        
    })
})
.catch((error) => {
    console.log("MongoDB Connection Failed: ", error);
})








// This is one of the ways to connect to mongodb using mongoose.

// import express from "express";
// const app = express();
// (async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGO_URI}/{DB_NAME}`,)
//         app.on("error", (error) => {
//             console.log("Error: ", error);
//             throw error
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`server is running on port ${process.env.PORT}`);
//         })

//     }
//     catch(error){
//         console.log("Error: ", error);
//         throw error
//     }
// })()
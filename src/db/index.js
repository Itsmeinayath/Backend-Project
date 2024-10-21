import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
// what is database . database is a collection of data that is stored in a computer system.
// whats is mongoose . mongoose is a library that is used to interact with the mongodb database.
// whats is mongodb . mongodb is a no sql database.
// whats is no sql database . no sql database is a database that is not based on the table like the sql database.


const connectDB = async () => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`,)
       console.log(`\n MongoDB Connected: ${connectionInstance.connection.host}`);
    }
    catch(error){
        console.log("MongoDB Connection Failed: ", error);
        process.exit(1);
    }
}

export default connectDB
import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

//asynce - await bcz DB in another continent ->may response delay
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection error: ", error);
    // process --> current application jo run ho rhi h ushka reference hai process
    process.exit(1);
  }
};

export default connectDB;

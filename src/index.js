//1st approach of connecting DB
// function connectDB(){}
// connectDB()

//2nd approach- connecting DB
//iffies - ye jo humaara function hai ushko immediately execute krdo
// iffies syntax --> ( () => {} )()

// require('dotenv').config()
// console.log(process.env)

// import mongoose from "mongoose"
// import { DB_NAME } from "./constant";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
  path: "./.env",
});


//2nd APPROACH OF COONECTING DATABASE - external file i.e, DB -> index.js
connectDB()
  .then(() => {
    app.on("error", () => {
      console.log("ERROR: ", error);
      throw error;
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`****Server is running at port: ${process.env.PORT}****`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !! Connection error:", err);
  });


//1st APPROACH OF COONECTING DATABASE
//iffie - module
// ;( async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error", ()=>{
//             console.log("ERROR: ", error)
//             throw error
//         })

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })

//     }catch(error){
//         console.log("ERROR: ", error)
//         throw error
//     }
// })()


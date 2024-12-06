import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refereshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

// middleware - jaate hue mujhse mil kr jana
// Ex: yha /register pr click kro tu registerUser() method toh execute hu jaye -- but jaate hue mujhse milkr jana
// yha upload.field ek middleware h uske baad method run ho rha h registerUser()

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1, //kitna file accept krna he yha 1 file accept krenge
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/referesh-token").post(refereshAccessToken);
//next() --> yha 2-2 method likhe hei post() mai - apna router confuse ho gya mujhe phle consa run krna aur ushe bateyega kon phle run ho gya h abb 2nd run krdo bhaiya router - thats why writes next()

export default router;

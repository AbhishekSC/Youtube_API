import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refereshToken = user.generateRefreshToken();

    //Storing referesh token to database
    user.refereshToken = refereshToken; //adding data to database
    await user.save({ validateBeforeSave: false }); //saving into the database

    return {
      accessToken,
      refereshToken,
    };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asynHandler(async (req, res) => {
  //   res.status(200).json({
  //     message: "ok",
  //   });

  //Algo for register user

  //1.get user details from frontend
  const { fullname, email, username, password } = req.body;
  //   console.log("Email : ", email);

  //2.validations - not empty field
  //Approach : 1 | conventional
  //   if (fullname === "") {
  //     throw new ApiError(400, "fullname is required!");
  //   }
  //Approach 2 | using array
  if (
    [fullname, username, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  //3.check if user already exist [use username, email]
  //findOne() --> first entry mil jayegi mongodb m wo return kr deta h
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists.");
  }

  //4.check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path; //avatar abhi local machine pr h | cloudinary pr nhi gya
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path; //local machine pr h | cloudinary pr nhi gya
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  //5.upload them to cloudinary, check for avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required.");
  }

  //6.create user object - create entry in db -->user created
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //7.remove password and refersh token field from response
  const createdUserRef = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //8.check for user creation
  if (!createdUserRef) {
    throw new ApiError(500, "Spmething went wrong while registering the user.");
  }

  //9.return our API response
  return res
    .status(201)
    .json(
      new ApiResponse(200, createdUserRef, "User registered successfully.")
    );
});

const loginUser = asynHandler(async (req, res) => {
  //steps:
  //1. req.body --> data
  //2. username or email based access?
  //3. find the user
  //4. password check
  //5. access token and referesh token
  //6. send this to cookies

  //1. req.body --> data
  const { username, email, password } = req.body;

  //2. username or email based access?
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  //3. find the user
  // User.findOne({email})
  // User.findOne({username})
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //4. password check
  // User -> mongodb ka mongoose ka OBJ hai - mongoose ke through jo jo method available h
  //isPasswordCorrect(), generateAccessToken() in user.controller --> ye method mere user m available h -- mera user?->user-jo database ka instance
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //5. access token and referesh token
  const { accessToken, refereshToken } = await generateAccessAndRefereshToken(
    user._id
  );

  //6. send this to cookies
  //unwanted thing we didn't want to send i.e, password, refereshToken
  const loggedInUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  // by default aapki cookies koi bhi modify kr skta h frontend pr
  //httpOnly, secure TRUE krne se ye cookie sief server se modify hogi | frontend bhr show hogi, modify nhi hogi
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshToken", refereshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refereshToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asynHandler(async (req, res) => {
  //1. find user which u want to logout --> using middleware
  //2. cookies clear and delete refresh token from db
  //3. accessToken, refereshToken clear or reset from database

  //1. hum user ko logout hi nhi kr pa rhe thea ish liye humne ek Auth waala middleware banaya taaki hume user mil jaye return m jisko logout krna h --> user Authenticated hai ki nhi
  //wo saara middleware ka kaam AUTH waala yha bhi kr skte thea
  //for reusibility purpose humne middleware banaya
  //jha jha hume user ka use hoga like post add krna ho, like krna ho post ko || pata krna pdega ki user Authenticated hai ki nhi

  //2.
  //delete referesh token from db
  User.findByIdAndUpdate(
    await req.user._id,
    {
      $set: {
        refereshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  //clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refereshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refereshAccessToken = asynHandler(async (req, res) => {
  const incomingRefereshToken =
    req.cookies.refereshToken || req.body.refereshToken;

  if (!incomingRefereshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefereshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid referesh token");
    }

    if (incomingRefereshToken != user?.refereshToken) {
      throw new ApiError(401, "Referesh token is expired or used");
    }
    //till there verification of token is done successfully!!

    //generating new access token
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newAccessToken, newRefereshToken } =
      await generateAccessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refereshToken", newRefereshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, newRefereshToken },
          "Access token refereshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid referesh token");
  }
});

//UPDATE CONTROLLERS
const changeCurrentPassword = asynHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  //setting up new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asynHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asynHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  //finding user and storing it in user variable without storing password {use select()}
  const user = await User.findByIdAndUpdate(
    re.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true } //new: true karne s update hone k baad jo info hoti h wo return hoti h yha
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asynHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  //uploaded on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asynHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }
  //uploaded on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading the cover image");
  }

  //updating on database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refereshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};

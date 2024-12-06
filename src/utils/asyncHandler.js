// APPROACH- 2

const asynHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
    .catch((err) => next(err));
  };
};

export { asynHandler };

// APPROACH- 1 [try - catch]
// const asyncHandler= () => {}
// const asyncHandler= (func) => { () =>{} }
// const asyncHandler= (func) =>  async() =>{}

// const asyncHandler= (func) => async(req, res, next) => {
//     try{
//         await func(req, res, next)
//     }catch(error){
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// }

// we can use this as a middleware . what is this middleware?.middleware is a function that takes three arguments, req, res, next.
// why are we using this middleware? to handle the errors in the async functions.
const asyncHandler = (requestHandler) => {
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
    }
}
 

export { asyncHandler }

// /*************  ✨ Command 🌟  *************/
// /**
//  * @function asyncHandler
//  * @description a middleware that takes an async function and returns a middleware
//  * that catches any errors thrown by the async function and sends the error as a response
//  * @param {Function} fn - the async function
//  * @returns {Function} a middleware that handles errors
//  */
// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         // call the async function
//         await fn(req, res, next);

//     }
//     catch(error){
//         // if there is an error, send it as a response
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message || "Internal Server Error"
//         })
//     }
// }

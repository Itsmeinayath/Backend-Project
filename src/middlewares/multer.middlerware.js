import multer from "multer";
// whats is middleware . middleware is a function that has access to the request and response object of the express application.
// whats is multer . multer is a middleware that is used to upload the files to the server.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        // here its a note in future we have to change the file name to avoid the conflict . we can unique name by using the uuid
        // we we need to generate the unique name we can use the uuid package
        cb(null, file.originalname)
    }
})

export const upload = multer(
    {
        storage: storage
    }
)
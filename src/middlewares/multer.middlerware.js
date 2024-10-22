import multer from 'multer';

// Set up the storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Keep original file name
    }
});

// Create multer upload instance
export const upload = multer({ storage }); // Properly initializing multer instance


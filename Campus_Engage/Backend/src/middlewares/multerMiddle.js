import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname + "-" + Date.now();
        //console.log(`[MULTER] created file: ${fileName} @ ${new Date().toISOString()}`);
        cb(null, fileName);
    }
});

export const upload = multer({ storage });
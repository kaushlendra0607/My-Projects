import multer from 'multer';
import fs from 'fs';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const pathStr = './public/temp';
        
        // Check if directory exists, if not, create it
        if (!fs.existsSync(pathStr)) {
            fs.mkdirSync(pathStr, { recursive: true });
        }
        
        cb(null, pathStr);
    },
    filename: function (req, file, cb) {
        // Extract the extension (e.g., .png)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        
        // Result: filename-123456789.png
        // We use 'path.basename' to strip the original extension from the name to avoid "image.png-123.png"
        const name = path.basename(file.originalname, ext);
        
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

export const upload = multer({ 
    storage,
    // Optional: Add limits to prevent memory/disk overflows causing crashes
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
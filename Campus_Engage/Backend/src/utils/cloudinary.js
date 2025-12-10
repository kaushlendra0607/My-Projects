import { v2 } from "cloudinary";
import fs from "fs";

v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    //console.log('[CLOUD] start upload:', localFilePath, new Date().toISOString());

    try {
        if (!localFilePath) return null;
        const response = await v2.uploader.upload(localFilePath, { resource_type: "auto" });
        //console.log('[CLOUD] uploaded OK:', response.url);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            //console.log('[CLOUD] deleted file:', localFilePath);
        }
        console.log("File has been uploaded: ", response.url);
        return response;
    } catch (error) {
        console.error('[CLOUD] upload error:', err);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.log(error);
        return null;
    }

}

export default uploadOnCloudinary;
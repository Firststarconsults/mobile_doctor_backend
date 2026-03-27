//config-cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Validate required environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Missing required Cloudinary environment variables. Please check your .env file.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const upload = async (file, folderName) => {
  const options = {
    folder: folderName, // Specify the folder name (user identifier)
    public_id: `${folderName}/${Date.now()}`, // Use a unique public_id with timestamp
  };

  try {
    const image = await cloudinary.uploader.upload(file, options);
    return image;
  } catch (error) {
    throw error;
  }
};

// Function to upload a base64-encoded image to Cloudinary
export const uploadBase64 = async (base64Data, folderName) => {
  const options = {
    folder: folderName,
    public_id: `${folderName}/${Date.now()}`,
  };

  try {
    // Cloudinary's API expects the base64 data to be prefixed by a data URI schema
    const image = await cloudinary.uploader.upload(`data:image/png;base64,${base64Data}`, options);
    return image;
  } catch (error) {
    throw error;
  }
};



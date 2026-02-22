import { v2 as cloudinary } from 'cloudinary'

// Ensure Cloudinary is configured
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

/**
 * Generate a signed upload signature for secure client-side uploads.
 * Restricts uploads to a specific folder structure: personapost/users/{userId}/posts/...
 */
export function generateUploadSignature(userId: string) {
    const timestamp = Math.round(new Date().getTime() / 1000)

    // Define strict folder path: personapost/users/{userId}/uploads
    // Random suffix for temp storage, will be organized by post ID later or simply use date
    const folder = `personapost/users/${userId}/uploads`

    const paramsToSign = {
        timestamp,
        folder,
    }

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    )

    return {
        timestamp,
        folder,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    }
}

/**
 * Upload an image (url or file path) to Cloudinary server-side.
 * Returns the secure URL and public ID.
 */
export async function uploadImage(file: string, folder: string) {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: folder,
        })
        return {
            success: true,
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height
        }
    } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw error
    }
}

/**
 * Delete an image from Cloudinary by its public ID.
 * Should be called when processing a deletion or cleanup.
 */
export async function deleteImage(publicId: string) {
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        return result.result === 'ok'
    } catch (error) {
        console.error('Cloudinary delete error:', error)
        return false
    }
}

export default cloudinary

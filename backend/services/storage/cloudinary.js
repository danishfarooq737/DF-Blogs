const { v2: cloudinary } = require('cloudinary');
const config = require('../../config');
const { httpError } = require('../../utils/http');

const { cloudName, apiKey, apiSecret, folder } = config.storage.cloudinary;
cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

module.exports = {
  name: 'cloudinary',

  /** Uploads an already-processed WebP buffer; `key` is the Cloudinary public id. */
  save(webpBuffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', format: 'webp', overwrite: false, unique_filename: true },
        (error, result) => {
          if (!error) return resolve({ key: result.public_id, url: result.secure_url });
          // Surface Cloudinary's reason (admin-only route) so misconfiguration is easy to diagnose.
          console.error('Cloudinary upload failed:', error.http_code, error.message);
          return reject(httpError(502, `Image storage error: ${error.message || 'upload failed'}`));
        },
      );
      stream.end(webpBuffer);
    });
  },

  async remove(key) {
    if (!key) return;
    await cloudinary.uploader.destroy(String(key), { resource_type: 'image' }).catch(() => {});
  },
};
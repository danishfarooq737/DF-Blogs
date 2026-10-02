const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');

const { uploadDir } = config.storage;

module.exports = {
  name: 'local',
  uploadDir,

  /** Stores an already-processed WebP buffer under a random filename. */
  async save(webpBuffer) {
    const key = `${crypto.randomBytes(16).toString('hex')}.webp`;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, key), webpBuffer);
    return { key, url: `${config.serverUrl}/uploads/${key}` };
  },

  /** Deletes a stored image. `path.basename` makes path traversal impossible. */
  async remove(key) {
    if (!key) return;
    await fs.unlink(path.join(uploadDir, path.basename(String(key)))).catch(() => {});
  },
};

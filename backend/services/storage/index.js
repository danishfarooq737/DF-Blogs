/**
 * Image-storage abstraction. Routes/controllers only ever call `save` and `remove`;
 * the provider is chosen with IMAGE_STORAGE=local|cloudinary.
 */
const config = require('../../config');
const { processImage } = require('./processImage');
const { httpError } = require('../../utils/http');

const providers = {
  local: () => require('./local'),
  cloudinary: () => require('./cloudinary'),
};

const load = providers[config.storage.provider];
if (!load) throw new Error(`Unknown IMAGE_STORAGE provider "${config.storage.provider}"`);
const provider = load();

module.exports = {
  providerName: provider.name,
  /** Validates + optimises the upload, then hands it to the active provider. */
  async save(buffer) {
    let optimised;
    try {
      optimised = await processImage(buffer);
    } catch {
      throw httpError(400, 'File is not a valid JPG, PNG or WebP image');
    }
    return provider.save(optimised);
  },
  remove: (key) => provider.remove(key),
};

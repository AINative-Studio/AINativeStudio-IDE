/**
 * Platform Mapper Utility
 *
 * Maps IDE platform identifiers to GitHub Release asset names.
 * Supports all major platforms and architectures.
 */

/**
 * Platform-to-asset name mapping
 * Maps the platform identifier used in update requests to the corresponding asset name pattern in GitHub releases
 */
const PLATFORM_ASSET_MAP = {
  // macOS
  'darwin': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',

  // Windows
  'win32-x64': 'win32-x64',
  'win32-x64-user': 'win32-x64-user-setup',  // User installer
  'win32-arm64': 'win32-arm64',

  // Linux
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'linux-arm': 'linux-armhf',  // ARM 32-bit
};

/**
 * Map platform identifier to asset name
 *
 * @param {string} platform - Platform identifier from update request
 * @returns {string|null} Asset name pattern or null if platform not supported
 *
 * @example
 * mapPlatformToAssetName('darwin-arm64') // Returns: 'darwin-arm64'
 * mapPlatformToAssetName('win32-x64') // Returns: 'win32-x64'
 * mapPlatformToAssetName('unsupported') // Returns: null
 */
function mapPlatformToAssetName(platform) {
  return PLATFORM_ASSET_MAP[platform] || null;
}

/**
 * Get list of all supported platforms
 *
 * @returns {string[]} Array of supported platform identifiers
 *
 * @example
 * getSupportedPlatforms() // Returns: ['darwin', 'darwin-arm64', 'win32-x64', ...]
 */
function getSupportedPlatforms() {
  return Object.keys(PLATFORM_ASSET_MAP);
}

/**
 * Check if a platform is supported
 *
 * @param {string} platform - Platform identifier to check
 * @returns {boolean} True if platform is supported, false otherwise
 *
 * @example
 * isPlatformSupported('darwin-arm64') // Returns: true
 * isPlatformSupported('unsupported') // Returns: false
 */
function isPlatformSupported(platform) {
  return platform in PLATFORM_ASSET_MAP;
}

/**
 * Get platform category (darwin, win32, linux)
 *
 * @param {string} platform - Platform identifier
 * @returns {string|null} Platform category or null if not found
 *
 * @example
 * getPlatformCategory('darwin-arm64') // Returns: 'darwin'
 * getPlatformCategory('win32-x64-user') // Returns: 'win32'
 */
function getPlatformCategory(platform) {
  if (platform.startsWith('darwin')) return 'darwin';
  if (platform.startsWith('win32')) return 'win32';
  if (platform.startsWith('linux')) return 'linux';
  return null;
}

module.exports = {
  mapPlatformToAssetName,
  getSupportedPlatforms,
  isPlatformSupported,
  getPlatformCategory,
  PLATFORM_ASSET_MAP
};

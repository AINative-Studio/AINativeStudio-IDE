/**
 * Platform Mapper Utility
 *
 * Maps IDE platform identifiers to GitHub release asset names.
 * This module provides the mapping logic needed to resolve platform-specific
 * asset names from GitHub releases.
 */

/**
 * Platform to asset name mapping
 * @constant {Object.<string, string>}
 */
const PLATFORM_ASSET_MAP = {
  'darwin': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'win32-x64',
  'win32-x64-user': 'win32-x64-user-setup',
  'win32-arm64': 'win32-arm64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
};

/**
 * Map IDE platform identifier to GitHub release asset name
 *
 * @param {string} platform - Platform identifier (e.g., 'darwin-arm64', 'win32-x64', 'linux-x64')
 * @returns {string|null} Asset name suffix for GitHub release assets, or null if platform is not supported
 *
 * @example
 * mapPlatformToAssetName('darwin-arm64')  // Returns: 'darwin-arm64'
 * mapPlatformToAssetName('win32-x64-user') // Returns: 'win32-x64-user-setup'
 * mapPlatformToAssetName('unsupported')    // Returns: null
 */
function mapPlatformToAssetName(platform) {
  return PLATFORM_ASSET_MAP[platform] || null;
}

/**
 * Get all supported platform identifiers
 *
 * @returns {string[]} Array of supported platform identifiers
 *
 * @example
 * getSupportedPlatforms()
 * // Returns: ['darwin', 'darwin-arm64', 'win32-x64', 'win32-x64-user', 'win32-arm64', 'linux-x64', 'linux-arm64']
 */
function getSupportedPlatforms() {
  return Object.keys(PLATFORM_ASSET_MAP);
}

/**
 * Check if a platform is supported
 *
 * @param {string} platform - Platform identifier to check
 * @returns {boolean} True if the platform is supported, false otherwise
 *
 * @example
 * isPlatformSupported('darwin-arm64')  // Returns: true
 * isPlatformSupported('freebsd')       // Returns: false
 */
function isPlatformSupported(platform) {
  return platform in PLATFORM_ASSET_MAP;
}

module.exports = {
  mapPlatformToAssetName,
  getSupportedPlatforms,
  isPlatformSupported,
  PLATFORM_ASSET_MAP
};

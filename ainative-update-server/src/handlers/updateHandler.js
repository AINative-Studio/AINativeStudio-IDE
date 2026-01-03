const GitHubService = require('../services/githubService');
const { mapPlatformToAssetName } = require('../utils/platformMapper');

const githubService = new GitHubService();

/**
 * Handle update check requests
 *
 * Endpoint: GET /api/update/:platform/:quality/:commit
 *
 * URL Parameters:
 * - platform: darwin, darwin-arm64, win32-x64, linux-x64, etc.
 * - quality: stable, insider (currently unused, for future)
 * - commit: Current client commit hash
 *
 * Response Logic:
 * 1. Extract platform and commit from request
 * 2. Map platform to asset name using platformMapper
 * 3. Fetch latest release from GitHub service
 * 4. Compare client commit with latest release commit
 * 5. If commits match → return HTTP 204 (No Content)
 * 6. If newer version available → return update metadata JSON
 * 7. Handle errors gracefully
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function handleUpdateCheck(req, res) {
  try {
    const { platform, quality, commit } = req.params;

    console.log(`Update check request - Platform: ${platform}, Quality: ${quality}, Commit: ${commit}`);

    // Validate platform and get corresponding asset name
    const assetName = mapPlatformToAssetName(platform);
    if (!assetName) {
      console.warn(`Unsupported platform requested: ${platform}`);
      return res.status(400).json({
        error: 'Unsupported platform',
        platform
      });
    }

    // Fetch latest release from GitHub
    let release;
    try {
      release = await githubService.getLatestRelease();
    } catch (error) {
      console.error('Failed to fetch latest release:', error);
      return res.status(500).json({
        error: 'Failed to check for updates'
      });
    }

    // Extract product version from tag name (e.g., "v1.5.0" -> "1.5.0")
    const productVersion = release.tagName.replace(/^v/, '');

    // For now, use tag name as version identifier
    // In production, this should compare actual commit hashes from release metadata
    // The client sends the commit hash it was built from, and we compare against
    // the commit hash of the latest release
    const latestCommit = release.tagName;

    // Check if client is already up to date
    if (latestCommit === commit) {
      console.log(`Client is up to date (${commit})`);
      return res.status(204).send();
    }

    console.log(`Update available: ${commit} -> ${latestCommit}`);

    // Get download URL for the platform-specific asset
    const url = await githubService.getAssetUrl(release, assetName);

    if (!url) {
      console.warn(`Asset not found for platform: ${platform} (${assetName})`);
      return res.status(404).json({
        error: 'Asset not found for platform',
        platform,
        assetName
      });
    }

    // Get SHA256 hash for the asset
    const sha256hash = await githubService.getSHA256Hash(release, assetName);

    if (!sha256hash) {
      console.warn(`SHA256 hash not found for platform: ${platform} (${assetName})`);
      // Continue without hash - it's optional but recommended
    }

    // Return update metadata
    const updateResponse = {
      version: latestCommit,
      productVersion,
      timestamp: release.publishedAt,
      url,
      sha256hash: sha256hash || undefined // Only include if available
    };

    console.log(`Sending update response for ${productVersion}`);
    return res.status(200).json(updateResponse);

  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error in update check handler:', error);
    return res.status(500).json({
      error: 'Failed to check for updates'
    });
  }
}

module.exports = { handleUpdateCheck };

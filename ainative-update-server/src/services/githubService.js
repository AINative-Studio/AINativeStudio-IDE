const { Octokit } = require('@octokit/rest');

/**
 * GitHubService
 *
 * Service for fetching release information from GitHub Releases API.
 * Includes caching, rate limit handling, and platform-specific asset resolution.
 */
class GitHubService {
  /**
   * Initialize the GitHub service
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.token] - GitHub personal access token (optional, falls back to env var)
   * @param {number} [options.cacheTTL=300000] - Cache time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(options = {}) {
    this.octokit = new Octokit({
      auth: options.token || process.env.GITHUB_TOKEN
    });
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
  }

  /**
   * Get the latest release from GitHub
   *
   * @param {string} [owner='AINative-Studio'] - Repository owner
   * @param {string} [repo='AINativeStudio-IDE'] - Repository name
   * @returns {Promise<Object>} Release data with tagName, name, publishedAt, and assets
   * @throws {Error} If GitHub API request fails
   */
  async getLatestRelease(owner = 'AINative-Studio', repo = 'AINativeStudio-IDE') {
    const cacheKey = `${owner}/${repo}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    try {
      console.log(`Fetching latest release for ${owner}/${repo}`);
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner,
        repo
      });

      const releaseData = {
        tagName: data.tag_name,
        name: data.name,
        publishedAt: new Date(data.published_at).getTime(),
        htmlUrl: data.html_url,
        assets: data.assets.map(asset => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          contentType: asset.content_type
        }))
      };

      // Cache the response
      this.cache.set(cacheKey, {
        data: releaseData,
        timestamp: Date.now()
      });

      console.log(`Successfully fetched release ${releaseData.tagName}`);
      return releaseData;
    } catch (error) {
      // Handle rate limiting
      if (error.status === 403) {
        console.error('GitHub API rate limit exceeded');

        // If we have cached data, return it even if expired
        if (cached) {
          console.log('Returning expired cache due to rate limit');
          return cached.data;
        }
      }

      // Handle not found
      if (error.status === 404) {
        console.error(`Repository ${owner}/${repo} not found or has no releases`);
      }

      console.error('GitHub API error:', error.message);
      throw error;
    }
  }

  /**
   * Get the download URL for a platform-specific asset
   *
   * @param {Object} release - Release object from getLatestRelease()
   * @param {string} platformAssetName - Platform identifier (e.g., 'darwin-arm64', 'win32-x64', 'linux-x64')
   * @returns {string|null} Download URL or null if not found
   */
  async getAssetUrl(release, platformAssetName) {
    if (!release || !release.assets) {
      console.error('Invalid release object provided');
      return null;
    }

    // Find the matching asset (typically a .zip file)
    const asset = release.assets.find(a =>
      a.name.includes(platformAssetName) && a.name.endsWith('.zip')
    );

    if (!asset) {
      console.warn(`No asset found for platform: ${platformAssetName}`);
      return null;
    }

    console.log(`Found asset: ${asset.name}`);
    return asset.url;
  }

  /**
   * Get the SHA256 hash for a platform-specific asset
   *
   * @param {Object} release - Release object from getLatestRelease()
   * @param {string} platformAssetName - Platform identifier (e.g., 'darwin-arm64', 'win32-x64', 'linux-x64')
   * @returns {Promise<string|null>} SHA256 hash or null if not found/failed
   */
  async getSHA256Hash(release, platformAssetName) {
    if (!release || !release.assets) {
      console.error('Invalid release object provided');
      return null;
    }

    // Find the .sha256 file for this platform
    const sha256Asset = release.assets.find(a =>
      a.name.includes(platformAssetName) && a.name.endsWith('.sha256')
    );

    if (!sha256Asset) {
      console.warn(`No SHA256 file found for platform: ${platformAssetName}`);
      return null;
    }

    try {
      console.log(`Fetching SHA256 from: ${sha256Asset.name}`);
      const response = await fetch(sha256Asset.url);

      if (!response.ok) {
        console.error(`Failed to fetch SHA256 file: ${response.status} ${response.statusText}`);
        return null;
      }

      const text = await response.text();

      // SHA256 files typically have format: "hash  filename" or just "hash"
      // Extract the hash part (first token before any whitespace)
      const hash = text.trim().split(/\s+/)[0];

      // Validate hash format (should be 64 hex characters)
      if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
        console.error(`Invalid SHA256 hash format: ${hash}`);
        return null;
      }

      console.log(`Successfully fetched SHA256 hash`);
      return hash;
    } catch (error) {
      console.error('Failed to fetch SHA256:', error.message);
      return null;
    }
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache stats with size and entries
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      expired: Date.now() - value.timestamp >= this.cacheTTL
    }));

    return {
      size: this.cache.size,
      ttl: this.cacheTTL,
      entries
    };
  }
}

module.exports = GitHubService;

/**
 * Example usage of GitHubService
 *
 * This file demonstrates how to use the GitHubService to fetch release information
 * from GitHub Releases API.
 *
 * DO NOT RUN THIS FILE DIRECTLY - it's for documentation purposes only.
 */

const GitHubService = require('./githubService');

async function exampleUsage() {
  // Initialize the service
  const githubService = new GitHubService({
    token: process.env.GITHUB_TOKEN, // Optional - increases rate limits
    cacheTTL: 300000 // 5 minutes (default)
  });

  try {
    // Example 1: Get latest release
    console.log('Fetching latest release...');
    const release = await githubService.getLatestRelease();
    console.log('Latest release:', {
      version: release.tagName,
      name: release.name,
      publishedAt: new Date(release.publishedAt).toISOString(),
      assetCount: release.assets.length
    });

    // Example 2: Get platform-specific asset URLs
    const platforms = ['darwin-arm64', 'darwin-x64', 'win32-x64', 'linux-x64'];

    for (const platform of platforms) {
      const url = await githubService.getAssetUrl(release, platform);
      console.log(`${platform}: ${url || 'Not found'}`);
    }

    // Example 3: Get SHA256 hashes for verification
    console.log('\nFetching SHA256 hashes...');
    for (const platform of platforms) {
      const hash = await githubService.getSHA256Hash(release, platform);
      console.log(`${platform}: ${hash ? hash.substring(0, 16) + '...' : 'Not found'}`);
    }

    // Example 4: Cache statistics
    console.log('\nCache statistics:');
    const stats = githubService.getCacheStats();
    console.log(stats);

    // Example 5: Manual cache clear
    githubService.clearCache();
    console.log('Cache cleared');

  } catch (error) {
    console.error('Error:', error.message);

    if (error.status === 403) {
      console.error('Rate limit exceeded. Set GITHUB_TOKEN environment variable to increase limits.');
    } else if (error.status === 404) {
      console.error('Repository not found or has no releases.');
    }
  }
}

// Example error handling patterns
async function errorHandlingExamples() {
  const githubService = new GitHubService();

  try {
    const release = await githubService.getLatestRelease();

    // Handle missing asset gracefully
    const url = await githubService.getAssetUrl(release, 'unknown-platform');
    if (!url) {
      console.log('Asset not found for this platform');
      // Use fallback or alternative source
    }

    // Handle missing SHA256 gracefully
    const hash = await githubService.getSHA256Hash(release, 'darwin-arm64');
    if (!hash) {
      console.log('SHA256 not available, skipping verification');
      // Proceed without verification or use alternative method
    }

  } catch (error) {
    // Handle GitHub API errors
    if (error.status === 403) {
      // Rate limit - try to use cached data
      console.log('Using cached data due to rate limit');
    } else {
      // Other errors - log and fail gracefully
      console.error('Failed to fetch release:', error.message);
    }
  }
}

// Export for reference (not executable)
module.exports = {
  exampleUsage,
  errorHandlingExamples
};

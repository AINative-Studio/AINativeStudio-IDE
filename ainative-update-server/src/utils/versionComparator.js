/**
 * Version Comparator Utility
 *
 * Provides utilities for comparing version strings and commit hashes
 * Used by the update server to determine if updates are available
 */

/**
 * Compare two semantic version strings
 *
 * @param {string} current - Current version (e.g., "1.4.0")
 * @param {string} latest - Latest version (e.g., "1.5.0")
 * @returns {number} -1 if current < latest, 0 if equal, 1 if current > latest
 */
function compareVersions(current, latest) {
  // Remove 'v' prefix if present
  const cleanCurrent = current.replace(/^v/, '');
  const cleanLatest = latest.replace(/^v/, '');

  const currentParts = cleanCurrent.split('.').map(Number);
  const latestParts = cleanLatest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}

/**
 * Check if a newer version is available
 *
 * @param {string} current - Current version
 * @param {string} latest - Latest version
 * @returns {boolean} True if latest is newer than current
 */
function isNewerVersion(current, latest) {
  return compareVersions(current, latest) < 0;
}

/**
 * Compare two commit hashes
 *
 * @param {string} current - Current commit hash
 * @param {string} latest - Latest commit hash
 * @returns {boolean} True if hashes are different (update available)
 */
function hasCommitChanged(current, latest) {
  if (!current || !latest) {
    return false;
  }
  return current.trim() !== latest.trim();
}

/**
 * Validate version string format
 *
 * @param {string} version - Version string to validate
 * @returns {boolean} True if version format is valid
 */
function isValidVersion(version) {
  if (!version || typeof version !== 'string') {
    return false;
  }

  // Remove 'v' prefix if present
  const clean = version.replace(/^v/, '');

  // Check if it matches semantic versioning pattern (major.minor.patch)
  const semverPattern = /^\d+\.\d+\.\d+$/;
  return semverPattern.test(clean);
}

module.exports = {
  compareVersions,
  isNewerVersion,
  hasCommitChanged,
  isValidVersion
};

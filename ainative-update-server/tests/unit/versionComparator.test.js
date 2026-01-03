/**
 * Unit Tests: Version Comparator
 *
 * Tests for version comparison utilities used in update server
 * Requirements: ≥3 unit tests for version comparison
 */

const {
  compareVersions,
  isNewerVersion,
  hasCommitChanged,
  isValidVersion
} = require('../../src/utils/versionComparator');

describe('Version Comparator', () => {
  describe('compareVersions', () => {
    test('should return -1 when current version is less than latest', () => {
      expect(compareVersions('1.4.0', '1.5.0')).toBe(-1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.4.9', '1.5.0')).toBe(-1);
    });

    test('should return 0 when versions are equal', () => {
      expect(compareVersions('1.5.0', '1.5.0')).toBe(0);
      expect(compareVersions('v1.5.0', '1.5.0')).toBe(0);
      expect(compareVersions('v1.5.0', 'v1.5.0')).toBe(0);
    });

    test('should return 1 when current version is greater than latest', () => {
      expect(compareVersions('1.6.0', '1.5.0')).toBe(1);
      expect(compareVersions('2.0.0', '1.5.0')).toBe(1);
      expect(compareVersions('1.5.1', '1.5.0')).toBe(1);
    });

    test('should handle versions with v prefix', () => {
      expect(compareVersions('v1.4.0', 'v1.5.0')).toBe(-1);
      expect(compareVersions('v1.5.0', 'v1.5.0')).toBe(0);
      expect(compareVersions('v1.6.0', 'v1.5.0')).toBe(1);
    });

    test('should compare major version differences correctly', () => {
      expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });

    test('should compare minor version differences correctly', () => {
      expect(compareVersions('1.4.9', '1.5.0')).toBe(-1);
      expect(compareVersions('1.5.0', '1.4.9')).toBe(1);
    });

    test('should compare patch version differences correctly', () => {
      expect(compareVersions('1.5.0', '1.5.1')).toBe(-1);
      expect(compareVersions('1.5.1', '1.5.0')).toBe(1);
    });
  });

  describe('isNewerVersion', () => {
    test('should return true when latest is newer than current', () => {
      expect(isNewerVersion('1.4.0', '1.5.0')).toBe(true);
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
      expect(isNewerVersion('1.5.0', '1.5.1')).toBe(true);
    });

    test('should return false when versions are equal', () => {
      expect(isNewerVersion('1.5.0', '1.5.0')).toBe(false);
      expect(isNewerVersion('v1.5.0', '1.5.0')).toBe(false);
    });

    test('should return false when current is newer than latest', () => {
      expect(isNewerVersion('1.6.0', '1.5.0')).toBe(false);
      expect(isNewerVersion('2.0.0', '1.5.0')).toBe(false);
    });

    test('should handle edge case with different version lengths', () => {
      expect(isNewerVersion('1.5', '1.5.0')).toBe(false);
      expect(isNewerVersion('1.5.0', '1.5')).toBe(false);
    });
  });

  describe('hasCommitChanged', () => {
    test('should return true when commit hashes are different', () => {
      expect(hasCommitChanged('abc123', 'def456')).toBe(true);
      expect(hasCommitChanged('v1.5.0', 'v1.6.0')).toBe(true);
      expect(hasCommitChanged('commit-old', 'commit-new')).toBe(true);
    });

    test('should return false when commit hashes are identical', () => {
      expect(hasCommitChanged('abc123', 'abc123')).toBe(false);
      expect(hasCommitChanged('v1.5.0', 'v1.5.0')).toBe(false);
    });

    test('should handle whitespace in commit hashes', () => {
      expect(hasCommitChanged('abc123 ', 'abc123')).toBe(false);
      expect(hasCommitChanged('abc123', ' abc123 ')).toBe(false);
      expect(hasCommitChanged(' abc123 ', ' abc123 ')).toBe(false);
    });

    test('should return false when either hash is null or undefined', () => {
      expect(hasCommitChanged(null, 'abc123')).toBe(false);
      expect(hasCommitChanged('abc123', null)).toBe(false);
      expect(hasCommitChanged(undefined, 'abc123')).toBe(false);
      expect(hasCommitChanged('abc123', undefined)).toBe(false);
    });

    test('should be case-sensitive for commit hashes', () => {
      expect(hasCommitChanged('ABC123', 'abc123')).toBe(true);
    });
  });

  describe('isValidVersion', () => {
    test('should return true for valid semantic version strings', () => {
      expect(isValidVersion('1.5.0')).toBe(true);
      expect(isValidVersion('v1.5.0')).toBe(true);
      expect(isValidVersion('0.0.1')).toBe(true);
      expect(isValidVersion('10.20.30')).toBe(true);
    });

    test('should return false for invalid version formats', () => {
      expect(isValidVersion('1.5')).toBe(false);
      expect(isValidVersion('1')).toBe(false);
      expect(isValidVersion('1.5.0.1')).toBe(false);
      expect(isValidVersion('v1.5')).toBe(false);
    });

    test('should return false for non-string inputs', () => {
      expect(isValidVersion(null)).toBe(false);
      expect(isValidVersion(undefined)).toBe(false);
      expect(isValidVersion(123)).toBe(false);
      expect(isValidVersion({})).toBe(false);
    });

    test('should return false for empty strings', () => {
      expect(isValidVersion('')).toBe(false);
      expect(isValidVersion('   ')).toBe(false);
    });

    test('should return false for non-numeric version parts', () => {
      expect(isValidVersion('1.5.x')).toBe(false);
      expect(isValidVersion('a.b.c')).toBe(false);
      expect(isValidVersion('1.5.beta')).toBe(false);
    });
  });
});

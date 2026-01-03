/**
 * Unit Tests for Platform Mapper
 */

const {
  mapPlatformToAssetName,
  getSupportedPlatforms,
  isPlatformSupported,
  getPlatformCategory,
  PLATFORM_ASSET_MAP
} = require('../../src/utils/platformMapper');

describe('Platform Mapper Unit Tests', () => {

  describe('mapPlatformToAssetName', () => {
    it('should map darwin-arm64 correctly', () => {
      expect(mapPlatformToAssetName('darwin-arm64')).toBe('darwin-arm64');
    });

    it('should map darwin correctly', () => {
      expect(mapPlatformToAssetName('darwin')).toBe('darwin-x64');
    });

    it('should map win32-x64 correctly', () => {
      expect(mapPlatformToAssetName('win32-x64')).toBe('win32-x64');
    });

    it('should map win32-x64-user correctly', () => {
      expect(mapPlatformToAssetName('win32-x64-user')).toBe('win32-x64-user-setup');
    });

    it('should map linux-x64 correctly', () => {
      expect(mapPlatformToAssetName('linux-x64')).toBe('linux-x64');
    });

    it('should return null for unsupported platform', () => {
      expect(mapPlatformToAssetName('unsupported')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(mapPlatformToAssetName('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(mapPlatformToAssetName(undefined)).toBeNull();
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return array of supported platforms', () => {
      const platforms = getSupportedPlatforms();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
    });

    it('should include all major platforms', () => {
      const platforms = getSupportedPlatforms();
      expect(platforms).toContain('darwin-arm64');
      expect(platforms).toContain('darwin');
      expect(platforms).toContain('win32-x64');
      expect(platforms).toContain('linux-x64');
    });

    it('should match PLATFORM_ASSET_MAP keys', () => {
      const platforms = getSupportedPlatforms();
      const mapKeys = Object.keys(PLATFORM_ASSET_MAP);
      expect(platforms).toEqual(mapKeys);
    });
  });

  describe('isPlatformSupported', () => {
    it('should return true for supported platforms', () => {
      expect(isPlatformSupported('darwin-arm64')).toBe(true);
      expect(isPlatformSupported('darwin')).toBe(true);
      expect(isPlatformSupported('win32-x64')).toBe(true);
      expect(isPlatformSupported('linux-x64')).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(isPlatformSupported('unsupported')).toBe(false);
      expect(isPlatformSupported('macos')).toBe(false);
      expect(isPlatformSupported('windows')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPlatformSupported('')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPlatformSupported(undefined)).toBe(false);
    });
  });

  describe('getPlatformCategory', () => {
    it('should return darwin for darwin platforms', () => {
      expect(getPlatformCategory('darwin')).toBe('darwin');
      expect(getPlatformCategory('darwin-arm64')).toBe('darwin');
    });

    it('should return win32 for windows platforms', () => {
      expect(getPlatformCategory('win32-x64')).toBe('win32');
      expect(getPlatformCategory('win32-arm64')).toBe('win32');
      expect(getPlatformCategory('win32-x64-user')).toBe('win32');
    });

    it('should return linux for linux platforms', () => {
      expect(getPlatformCategory('linux-x64')).toBe('linux');
      expect(getPlatformCategory('linux-arm64')).toBe('linux');
      expect(getPlatformCategory('linux-arm')).toBe('linux');
    });

    it('should return null for unknown platforms', () => {
      expect(getPlatformCategory('unsupported')).toBeNull();
      expect(getPlatformCategory('')).toBeNull();
      expect(getPlatformCategory(undefined)).toBeNull();
    });
  });

  describe('PLATFORM_ASSET_MAP', () => {
    it('should be an object', () => {
      expect(typeof PLATFORM_ASSET_MAP).toBe('object');
    });

    it('should have valid mappings', () => {
      Object.entries(PLATFORM_ASSET_MAP).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
        expect(key.length).toBeGreaterThan(0);
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should include all major platforms and architectures', () => {
      expect(PLATFORM_ASSET_MAP).toHaveProperty('darwin');
      expect(PLATFORM_ASSET_MAP).toHaveProperty('darwin-arm64');
      expect(PLATFORM_ASSET_MAP).toHaveProperty('win32-x64');
      expect(PLATFORM_ASSET_MAP).toHaveProperty('linux-x64');
    });
  });
});

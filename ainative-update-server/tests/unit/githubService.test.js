/**
 * Unit Tests for GitHub Service
 */

const GitHubService = require('../../src/services/githubService');
const nock = require('nock');

describe('GitHub Service Unit Tests', () => {
  let service;

  beforeEach(() => {
    service = new GitHubService({
      token: 'test_token',
      cacheTTL: 1000
    });
  });

  afterEach(() => {
    service.clearCache();
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultService = new GitHubService();
      expect(defaultService.octokit).toBeDefined();
      expect(defaultService.cache).toBeInstanceOf(Map);
      expect(defaultService.cacheTTL).toBe(300000);
    });

    it('should initialize with custom cache TTL', () => {
      const customService = new GitHubService({ cacheTTL: 60000 });
      expect(customService.cacheTTL).toBe(60000);
    });

    it('should use provided token', () => {
      const tokenService = new GitHubService({ token: 'custom_token' });
      expect(tokenService.octokit).toBeDefined();
    });
  });

  describe('getLatestRelease', () => {
    it('should fetch and parse release data', async () => {
      // Mock Octokit directly
      service.octokit.rest.repos.getLatestRelease = jest.fn().mockResolvedValue({
        data: {
          tag_name: 'v1.5.0',
          name: 'Test Release',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test',
          assets: [
            {
              name: 'test.zip',
              browser_download_url: 'https://github.com/test.zip',
              size: 1000,
              content_type: 'application/zip'
            }
          ]
        }
      });

      const release = await service.getLatestRelease();

      expect(release.tagName).toBe('v1.5.0');
      expect(release.name).toBe('Test Release');
      expect(release.publishedAt).toBeGreaterThan(0);
      expect(release.assets).toHaveLength(1);
      expect(release.assets[0].name).toBe('test.zip');
    });

    it('should cache release data', async () => {
      service.octokit.rest.repos.getLatestRelease = jest.fn().mockResolvedValue({
        data: {
          tag_name: 'v1.5.0',
          name: 'Test',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com',
          assets: []
        }
      });

      await service.getLatestRelease();
      const cached = await service.getLatestRelease();

      expect(cached.tagName).toBe('v1.5.0');
      // Should only call API once due to caching
      expect(service.octokit.rest.repos.getLatestRelease).toHaveBeenCalledTimes(1);
    });

    it('should handle 404 errors', async () => {
      service.octokit.rest.repos.getLatestRelease = jest.fn().mockRejectedValue({
        status: 404,
        message: 'Not Found'
      });

      await expect(service.getLatestRelease()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      service.octokit.rest.repos.getLatestRelease = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(service.getLatestRelease()).rejects.toThrow();
    });
  });

  describe('getAssetUrl', () => {
    it('should find matching asset', async () => {
      const release = {
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            url: 'https://github.com/darwin.zip'
          },
          {
            name: 'ainative-studio-win32-x64.zip',
            url: 'https://github.com/win.zip'
          }
        ]
      };

      const url = await service.getAssetUrl(release, 'darwin-arm64');
      expect(url).toBe('https://github.com/darwin.zip');
    });

    it('should return null for non-existent asset', async () => {
      const release = {
        assets: [
          {
            name: 'other-file.zip',
            url: 'https://github.com/other.zip'
          }
        ]
      };

      const url = await service.getAssetUrl(release, 'darwin-arm64');
      expect(url).toBeNull();
    });

    it('should return null for invalid release object', async () => {
      const url = await service.getAssetUrl(null, 'darwin-arm64');
      expect(url).toBeNull();
    });

    it('should only match .zip files', async () => {
      const release = {
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.tar.gz',
            url: 'https://github.com/darwin.tar.gz'
          },
          {
            name: 'ainative-studio-darwin-arm64.zip',
            url: 'https://github.com/darwin.zip'
          }
        ]
      };

      const url = await service.getAssetUrl(release, 'darwin-arm64');
      expect(url).toBe('https://github.com/darwin.zip');
    });
  });

  describe('getSHA256Hash', () => {
    it('should fetch and parse SHA256 hash', async () => {
      const release = {
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      // Mock global fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  file.zip')
      });

      const hash = await service.getSHA256Hash(release, 'darwin-arm64');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      delete global.fetch;
    });

    it('should validate hash format', async () => {
      const release = {
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('invalid_hash')
      });

      const hash = await service.getSHA256Hash(release, 'darwin-arm64');
      expect(hash).toBeNull();

      delete global.fetch;
    });

    it('should return null for missing SHA256 file', async () => {
      const release = { assets: [] };
      const hash = await service.getSHA256Hash(release, 'darwin-arm64');
      expect(hash).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const release = {
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const hash = await service.getSHA256Hash(release, 'darwin-arm64');
      expect(hash).toBeNull();

      delete global.fetch;
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      service.cache.set('test', { data: 'test', timestamp: Date.now() });
      service.clearCache();

      expect(service.cache.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      service.cache.set('test', {
        data: { tagName: 'v1.0.0' },
        timestamp: Date.now()
      });

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.ttl).toBe(1000);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].key).toBe('test');
    });

    it('should mark expired cache entries', async () => {
      service.cache.set('test', {
        data: { tagName: 'v1.0.0' },
        timestamp: Date.now() - 2000
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = service.getCacheStats();
      expect(stats.entries[0].expired).toBe(true);
    });
  });
});

/**
 * Integration Tests for Error Scenarios
 */

const GitHubService = require('../../src/services/githubService');
const { handleUpdateCheck } = require('../../src/handlers/updateHandler');
const nock = require('nock');

describe('Error Scenario Integration Tests', () => {

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GitHub API Error Handling', () => {
    it('should handle 500 server errors from GitHub API', async () => {
      // Clear module cache to get fresh instance
      jest.resetModules();
      const GitHubService = require('../../src/services/githubService');
      const { handleUpdateCheck } = require('../../src/handlers/updateHandler');

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(500, { message: 'Internal Server Error' });

      const req = {
        params: {
          platform: 'darwin-arm64',
          quality: 'stable',
          commit: 'test'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };

      await handleUpdateCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('update')
        })
      );
    });

    it('should handle network timeouts', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .delayConnection(5000)
        .reply(200, {});

      const service = new GitHubService({ token: 'test' });

      const startTime = Date.now();
      try {
        await service.getLatestRelease();
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000);
      }
    }, 15000);

    it('should handle malformed JSON responses', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, 'not valid json');

      const service = new GitHubService({ token: 'test' });

      await expect(service.getLatestRelease()).rejects.toThrow();
    });

    it('should handle repository not found error', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(404, {
          message: 'Not Found',
          documentation_url: 'https://docs.github.com/rest'
        });

      const service = new GitHubService({ token: 'test' });

      await expect(service.getLatestRelease()).rejects.toThrow();
    });
  });

  describe('Asset Resolution Errors', () => {
    it('should handle missing platform asset gracefully', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, {
          tag_name: 'v1.5.0',
          name: 'Test Release',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com',
          assets: [
            {
              name: 'other-platform.zip',
              browser_download_url: 'https://github.com/other.zip',
              size: 1000,
              content_type: 'application/zip'
            }
          ]
        });

      const req = {
        params: {
          platform: 'darwin-arm64',
          quality: 'stable',
          commit: 'old_commit'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };

      await handleUpdateCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Asset not found for platform'
        })
      );
    });

    it('should handle SHA256 file fetch failure', async () => {
      const service = new GitHubService({ token: 'test' });

      const release = {
        assets: [
          {
            name: 'test.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      nock('https://example.com')
        .get('/hash.sha256')
        .reply(404);

      const hash = await service.getSHA256Hash(release, 'test');
      expect(hash).toBeNull();
    });

    it('should handle empty SHA256 file', async () => {
      const service = new GitHubService({ token: 'test' });

      const release = {
        assets: [
          {
            name: 'test.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      nock('https://example.com')
        .get('/hash.sha256')
        .reply(200, '');

      const hash = await service.getSHA256Hash(release, 'test');
      expect(hash).toBeNull();
    });

    it('should handle SHA256 file with invalid format', async () => {
      const service = new GitHubService({ token: 'test' });

      const release = {
        assets: [
          {
            name: 'test.zip.sha256',
            url: 'https://example.com/hash.sha256'
          }
        ]
      };

      nock('https://example.com')
        .get('/hash.sha256')
        .reply(200, 'invalid_hash_format_here');

      const hash = await service.getSHA256Hash(release, 'test');
      expect(hash).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long commit hashes', async () => {
      const longCommit = 'a'.repeat(1000);

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, {
          tag_name: 'v1.5.0',
          name: 'Test',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com',
          assets: []
        });

      const req = {
        params: {
          platform: 'darwin-arm64',
          quality: 'stable',
          commit: longCommit
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };

      await handleUpdateCheck(req, res);

      expect(res.status).toHaveBeenCalled();
    });

    it('should handle special characters in commit hash', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, {
          tag_name: 'v1.5.0',
          name: 'Test',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com',
          assets: []
        });

      const req = {
        params: {
          platform: 'darwin-arm64',
          quality: 'stable',
          commit: 'test@#$%^&*()'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
      };

      await handleUpdateCheck(req, res);

      expect(res.status).toHaveBeenCalled();
    });

    it('should handle multiple rapid requests', async () => {
      const service = new GitHubService({ cacheTTL: 60000, token: 'test_token' });
      service.clearCache(); // Ensure clean state

      service.octokit.rest.repos.getLatestRelease = jest.fn().mockResolvedValue({
        data: {
          tag_name: 'v1.5.0',
          name: 'Test',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com',
          assets: []
        }
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.getLatestRelease());
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.tagName).toBe('v1.5.0');
      });

      // Should only call API once due to caching
      expect(service.octokit.rest.repos.getLatestRelease).toHaveBeenCalledTimes(1);
    });
  });
});

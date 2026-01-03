/**
 * Integration Tests: Update Handler
 *
 * End-to-end tests for the update check endpoint
 * Requirements: ≥3 integration tests
 */

const request = require('supertest');
const nock = require('nock');
const handler = require('../../index');

// Create a simple Express app for testing
const express = require('express');
const app = express();
app.all('*', handler);

describe('Update Handler Integration Tests', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Full update flow with mock GitHub API', () => {
    test('should return update when newer version is available', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          },
          {
            name: 'ainative-studio-darwin-arm64.zip.sha256',
            browser_download_url: 'https://example.com/hash.sha256',
            size: 128,
            content_type: 'text/plain'
          }
        ]
      };

      const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      nock('https://example.com')
        .get('/hash.sha256')
        .reply(200, validHash);

      const response = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);

      expect(response.body).toHaveProperty('version', 'v1.5.0');
      expect(response.body).toHaveProperty('productVersion', '1.5.0');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('url', 'https://github.com/.../ainative-studio-darwin-arm64.zip');
      expect(response.body).toHaveProperty('sha256hash', validHash);
    });

    test('should return 204 when client is already up to date', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      await request(app)
        .get('/api/update/darwin-arm64/stable/v1.5.0')
        .expect(204);
    });

    test('should handle Windows platform correctly', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-win32-x64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-win32-x64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      const response = await request(app)
        .get('/api/update/win32-x64/stable/v1.4.0')
        .expect(200);

      expect(response.body).toHaveProperty('url', 'https://github.com/.../ainative-studio-win32-x64.zip');
    });

    test('should handle Linux platform correctly', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-linux-x64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-linux-x64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      const response = await request(app)
        .get('/api/update/linux-x64/stable/v1.4.0')
        .expect(200);

      expect(response.body).toHaveProperty('url', 'https://github.com/.../ainative-studio-linux-x64.zip');
    });
  });

  describe('Error handling', () => {
    test('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .get('/api/update/unsupported-platform/stable/v1.4.0')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Unsupported platform');
      expect(response.body).toHaveProperty('platform', 'unsupported-platform');
    });

    test('should return 404 when asset not found for platform', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-win32-x64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-win32-x64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      const response = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Asset not found for platform');
    });

    test('should return 500 when GitHub API fails', async () => {
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .replyWithError('Network error');

      const response = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to check for updates');
    });

    test('should return 400 for invalid request path', async () => {
      const response = await request(app)
        .get('/api/invalid/path')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request path');
    });

    test('should return 400 for incomplete path', async () => {
      const response = await request(app)
        .get('/api/update/darwin-arm64/stable')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request path');
    });
  });

  describe('CORS headers', () => {
    test('should include CORS headers in response', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      const response = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.5.0')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, OPTIONS');
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, OPTIONS');
    });
  });

  describe('Caching behavior', () => {
    test('should cache GitHub API responses and serve subsequent requests from cache', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      // Only mock once - second request should use cache
      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      // First request
      await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);

      // Second request - should work even without new nock intercept (uses cache)
      await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);
    });
  });

  describe('SHA256 hash handling', () => {
    test('should return update without sha256hash when hash file not available', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../ainative-studio-darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .reply(200, mockReleaseData);

      const response = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('url');
      expect(response.body.sha256hash).toBeUndefined();
    });
  });

  describe('Multiple platform support in single release', () => {
    test('should handle requests for different platforms from same release', async () => {
      const mockReleaseData = {
        tag_name: 'v1.5.0',
        name: 'Release 1.5.0',
        published_at: '2024-01-15T10:00:00Z',
        html_url: 'https://github.com/AINative-Studio/AINativeStudio-IDE/releases/tag/v1.5.0',
        assets: [
          {
            name: 'ainative-studio-darwin-arm64.zip',
            browser_download_url: 'https://github.com/.../darwin-arm64.zip',
            size: 150000000,
            content_type: 'application/zip'
          },
          {
            name: 'ainative-studio-win32-x64.zip',
            browser_download_url: 'https://github.com/.../win32-x64.zip',
            size: 150000000,
            content_type: 'application/zip'
          },
          {
            name: 'ainative-studio-linux-x64.zip',
            browser_download_url: 'https://github.com/.../linux-x64.zip',
            size: 150000000,
            content_type: 'application/zip'
          }
        ]
      };

      nock('https://api.github.com')
        .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
        .times(3)
        .reply(200, mockReleaseData);

      // Test darwin
      const darwinResponse = await request(app)
        .get('/api/update/darwin-arm64/stable/v1.4.0')
        .expect(200);
      expect(darwinResponse.body.url).toContain('darwin-arm64');

      // Test Windows
      const winResponse = await request(app)
        .get('/api/update/win32-x64/stable/v1.4.0')
        .expect(200);
      expect(winResponse.body.url).toContain('win32-x64');

      // Test Linux
      const linuxResponse = await request(app)
        .get('/api/update/linux-x64/stable/v1.4.0')
        .expect(200);
      expect(linuxResponse.body.url).toContain('linux-x64');
    });
  });
});

/**
 * Unit Tests: Update Handler
 *
 * Additional tests for update handler edge cases and error conditions
 */

const { handleUpdateCheck } = require('../../src/handlers/updateHandler');
const GitHubService = require('../../src/services/githubService');

jest.mock('../../src/services/githubService');

describe('Update Handler Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {
        platform: 'darwin-arm64',
        quality: 'stable',
        commit: 'abc123'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('Error handling', () => {
    test('should return 500 when GitHub service throws error', async () => {
      const mockError = new Error('GitHub API error');
      GitHubService.prototype.getLatestRelease = jest.fn().mockRejectedValue(mockError);

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to check for updates'
      });
    });

    test('should return 500 when unexpected error occurs', async () => {
      GitHubService.prototype.getLatestRelease = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to check for updates'
      });
    });
  });

  describe('Version comparison', () => {
    test('should return 204 when commits match', async () => {
      const mockRelease = {
        tagName: 'v1.5.0',
        name: 'Release 1.5.0',
        publishedAt: Date.now(),
        assets: [
          { name: 'ainative-studio-darwin-arm64.zip', url: 'https://example.com/download.zip' }
        ]
      };

      GitHubService.prototype.getLatestRelease = jest.fn().mockResolvedValue(mockRelease);

      mockReq.params.commit = 'v1.5.0';

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    test('should return update metadata when newer version available', async () => {
      const mockRelease = {
        tagName: 'v1.5.0',
        name: 'Release 1.5.0',
        publishedAt: 1704672000000,
        assets: [
          { name: 'ainative-studio-darwin-arm64.zip', url: 'https://example.com/download.zip' }
        ]
      };

      GitHubService.prototype.getLatestRelease = jest.fn().mockResolvedValue(mockRelease);
      GitHubService.prototype.getAssetUrl = jest.fn().mockResolvedValue('https://example.com/download.zip');
      GitHubService.prototype.getSHA256Hash = jest.fn().mockResolvedValue('abc123hash');

      mockReq.params.commit = 'v1.4.0';

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v1.5.0',
          productVersion: '1.5.0',
          url: 'https://example.com/download.zip',
          sha256hash: 'abc123hash'
        })
      );
    });

    test('should handle missing SHA256 hash gracefully', async () => {
      const mockRelease = {
        tagName: 'v1.5.0',
        name: 'Release 1.5.0',
        publishedAt: 1704672000000,
        assets: [
          { name: 'ainative-studio-darwin-arm64.zip', url: 'https://example.com/download.zip' }
        ]
      };

      GitHubService.prototype.getLatestRelease = jest.fn().mockResolvedValue(mockRelease);
      GitHubService.prototype.getAssetUrl = jest.fn().mockResolvedValue('https://example.com/download.zip');
      GitHubService.prototype.getSHA256Hash = jest.fn().mockResolvedValue(null);

      mockReq.params.commit = 'v1.4.0';

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.sha256hash).toBeUndefined();
    });
  });

  describe('Platform validation', () => {
    test('should return 400 for invalid platform', async () => {
      mockReq.params.platform = 'unsupported-platform';

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unsupported platform',
        platform: 'unsupported-platform'
      });
    });

    test('should return 404 when asset not found for platform', async () => {
      const mockRelease = {
        tagName: 'v1.5.0',
        name: 'Release 1.5.0',
        publishedAt: 1704672000000,
        assets: []
      };

      GitHubService.prototype.getLatestRelease = jest.fn().mockResolvedValue(mockRelease);
      GitHubService.prototype.getAssetUrl = jest.fn().mockResolvedValue(null);

      await handleUpdateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Asset not found for platform',
        platform: 'darwin-arm64',
        assetName: 'darwin-arm64'
      });
    });
  });
});

/**
 * Unit Tests for Main Entry Point (index.js)
 */

describe('Index Entry Point', () => {
  let index;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export a handler function', () => {
    index = require('../../index');
    expect(typeof index).toBe('function');
  });

  it('should handle CORS preflight requests', async () => {
    index = require('../../index');

    const req = {
      method: 'OPTIONS',
      url: '/api/update/darwin-arm64/stable/test123'
    };

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn()
    };

    await index(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('should return 400 for invalid path', async () => {
    index = require('../../index');

    const req = {
      method: 'GET',
      url: '/invalid/path'
    };

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await index(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Invalid request path')
      })
    );
  });

  it('should parse path parameters correctly', async () => {
    const nock = require('nock');

    nock('https://api.github.com')
      .get('/repos/AINative-Studio/AINativeStudio-IDE/releases/latest')
      .reply(200, {
        tag_name: 'v1.5.0',
        name: 'Test',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com',
        assets: []
      });

    index = require('../../index');

    const req = {
      method: 'GET',
      url: '/api/update/darwin-arm64/stable/test123'
    };

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    await index(req, res);

    expect(req.params).toEqual({
      platform: 'darwin-arm64',
      quality: 'stable',
      commit: 'test123'
    });

    nock.cleanAll();
  });
});

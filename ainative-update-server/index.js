const { handleUpdateCheck } = require('./src/handlers/updateHandler');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path parameters from URL
  // Expected: /api/update/:platform/:quality/:commit
  const pathParts = req.url.split('/').filter(Boolean);

  if (pathParts[0] !== 'api' || pathParts[1] !== 'update' || pathParts.length < 5) {
    return res.status(400).json({ error: 'Invalid request path' });
  }

  // Extract parameters
  req.params = {
    platform: pathParts[2],
    quality: pathParts[3],
    commit: pathParts[4]
  };

  // Handle update check
  return handleUpdateCheck(req, res);
};

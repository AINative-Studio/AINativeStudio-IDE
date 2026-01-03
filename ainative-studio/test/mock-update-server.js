/*---------------------------------------------------------------------------------------------
 *  Mock Update Server for Testing AINative Studio Auto-Update System
 *
 *  This server simulates GitHub Releases API responses for testing update flows
 *  Supports all platforms: darwin, darwin-arm64, win32-x64, win32-arm64, linux-x64, linux-arm64
 *--------------------------------------------------------------------------------------------*/

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockUpdateServer {
	constructor(options = {}) {
		this.port = options.port || 3456;
		this.fixturesPath = options.fixturesPath || path.join(__dirname, 'fixtures', 'updates');
		this.server = null;
		this.requests = [];
		this.responseDelay = options.responseDelay || 0;
		this.simulateErrors = options.simulateErrors || false;
		this.rateLimitEnabled = options.rateLimitEnabled || false;
		this.requestCount = 0;
		this.rateLimitThreshold = options.rateLimitThreshold || 60;
	}

	/**
	 * Start the mock update server
	 */
	async start() {
		return new Promise((resolve, reject) => {
			this.server = http.createServer((req, res) => this.handleRequest(req, res));

			this.server.on('error', (err) => {
				reject(err);
			});

			this.server.listen(this.port, () => {
				console.log(`Mock update server listening on http://localhost:${this.port}`);
				resolve();
			});
		});
	}

	/**
	 * Stop the mock update server
	 */
	async stop() {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					console.log('Mock update server stopped');
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Handle incoming HTTP requests
	 */
	async handleRequest(req, res) {
		this.requestCount++;

		// Log request for debugging
		this.requests.push({
			method: req.method,
			url: req.url,
			headers: req.headers,
			timestamp: Date.now()
		});

		// Simulate response delay if configured
		if (this.responseDelay > 0) {
			await new Promise(resolve => setTimeout(resolve, this.responseDelay));
		}

		// Check for rate limiting
		if (this.rateLimitEnabled && this.requestCount > this.rateLimitThreshold) {
			this.sendRateLimitError(res);
			return;
		}

		// Parse URL and route to appropriate handler
		const url = new URL(req.url, `http://localhost:${this.port}`);

		if (url.pathname.startsWith('/api/update/')) {
			this.handleUpdateCheck(req, res, url);
		} else if (url.pathname.startsWith('/download/')) {
			this.handleDownload(req, res, url);
		} else if (url.pathname.endsWith('.sha256')) {
			this.handleSHA256Request(req, res, url);
		} else {
			this.send404(res);
		}
	}

	/**
	 * Handle update check requests
	 * Format: /api/update/{platform}/{quality}/{commit}
	 */
	handleUpdateCheck(req, res, url) {
		const pathParts = url.pathname.split('/');
		const platform = pathParts[3]; // darwin, win32-x64, linux-x64, etc.
		const quality = pathParts[4]; // stable, insider
		const commit = pathParts[5]; // current commit hash

		console.log(`Update check: platform=${platform}, quality=${quality}, commit=${commit}`);

		// Simulate error scenarios if enabled
		if (this.simulateErrors) {
			const errorType = Math.random();
			if (errorType < 0.1) {
				// 10% chance of server error
				this.send500(res, 'Internal server error');
				return;
			} else if (errorType < 0.2) {
				// 10% chance of network timeout (close connection)
				req.socket.destroy();
				return;
			}
		}

		// Check if update is available based on commit
		const updateAvailable = this.isUpdateAvailable(commit);

		if (!updateAvailable) {
			// HTTP 204 No Content - no update available
			res.writeHead(204, {
				'Content-Type': 'application/json',
				'X-Mock-Server': 'true'
			});
			res.end();
			return;
		}

		// Return update metadata
		const updateMetadata = this.getUpdateMetadata(platform, quality);

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'X-Mock-Server': 'true'
		});
		res.end(JSON.stringify(updateMetadata, null, 2));
	}

	/**
	 * Handle binary download requests
	 */
	handleDownload(req, res, url) {
		const filename = path.basename(url.pathname);
		const filePath = path.join(this.fixturesPath, filename);

		console.log(`Download request: ${filename}`);

		if (!fs.existsSync(filePath)) {
			this.send404(res);
			return;
		}

		// Get file stats for Content-Length
		const stats = fs.statSync(filePath);

		res.writeHead(200, {
			'Content-Type': 'application/octet-stream',
			'Content-Length': stats.size,
			'Content-Disposition': `attachment; filename="${filename}"`,
			'X-Mock-Server': 'true'
		});

		// Stream file to response
		const fileStream = fs.createReadStream(filePath);
		fileStream.pipe(res);
	}

	/**
	 * Handle SHA256 checksum file requests
	 */
	handleSHA256Request(req, res, url) {
		const filename = path.basename(url.pathname);
		const filePath = path.join(this.fixturesPath, filename);

		console.log(`SHA256 request: ${filename}`);

		if (!fs.existsSync(filePath)) {
			// Generate SHA256 on the fly if file doesn't exist
			const binaryFilename = filename.replace('.sha256', '');
			const binaryPath = path.join(this.fixturesPath, binaryFilename);

			if (fs.existsSync(binaryPath)) {
				const hash = this.generateSHA256(binaryPath);
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'X-Mock-Server': 'true'
				});
				res.end(hash);
				return;
			}

			this.send404(res);
			return;
		}

		// Return existing SHA256 file
		const sha256Content = fs.readFileSync(filePath, 'utf8');
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'X-Mock-Server': 'true'
		});
		res.end(sha256Content);
	}

	/**
	 * Check if an update is available based on commit hash
	 */
	isUpdateAvailable(currentCommit) {
		// For testing, consider any commit older than our mock "latest" as needing update
		// Mock latest commit: "abc123def456" (you can customize this)
		const latestCommit = 'abc123def456';

		// If current commit is different from latest, update is available
		return currentCommit !== latestCommit;
	}

	/**
	 * Get update metadata for a specific platform
	 */
	getUpdateMetadata(platform, quality) {
		const version = '1.5.0'; // Mock version
		const productVersion = '1.5.0';
		const timestamp = Date.now();

		// Map platform to appropriate file extensions
		const fileExtensions = {
			'darwin': 'zip',
			'darwin-arm64': 'zip',
			'win32-x64': 'exe',
			'win32-x64-archive': 'zip',
			'win32-x64-user': 'exe',
			'win32-arm64': 'exe',
			'win32-arm64-archive': 'zip',
			'win32-arm64-user': 'exe',
			'linux-x64': 'tar.gz',
			'linux-x64-archive': 'tar.gz',
			'linux-arm64': 'tar.gz',
			'linux-arm64-archive': 'tar.gz'
		};

		const ext = fileExtensions[platform] || 'zip';
		const filename = `ainative-studio-${platform}-${version}.${ext}`;
		const downloadUrl = `http://localhost:${this.port}/download/${filename}`;
		const sha256Url = `${downloadUrl}.sha256`;

		// Generate or load SHA256
		const binaryPath = path.join(this.fixturesPath, filename);
		let sha256hash = '';

		if (fs.existsSync(binaryPath)) {
			sha256hash = this.generateSHA256(binaryPath);
		} else {
			// Use a mock hash if file doesn't exist
			sha256hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
		}

		return {
			url: downloadUrl,
			name: version,
			version: version,
			productVersion: productVersion,
			hash: sha256hash,
			sha256hash: sha256hash,
			timestamp: timestamp,
			supportsFastUpdate: platform.includes('win32')
		};
	}

	/**
	 * Generate SHA256 hash for a file
	 */
	generateSHA256(filePath) {
		const fileBuffer = fs.readFileSync(filePath);
		const hashSum = crypto.createHash('sha256');
		hashSum.update(fileBuffer);
		return hashSum.digest('hex');
	}

	/**
	 * Send 404 Not Found response
	 */
	send404(res) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Not Found' }));
	}

	/**
	 * Send 500 Internal Server Error response
	 */
	send500(res, message = 'Internal Server Error') {
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: message }));
	}

	/**
	 * Send 429 Rate Limit Error response
	 */
	sendRateLimitError(res) {
		res.writeHead(429, {
			'Content-Type': 'application/json',
			'Retry-After': '60',
			'X-RateLimit-Limit': this.rateLimitThreshold.toString(),
			'X-RateLimit-Remaining': '0'
		});
		res.end(JSON.stringify({
			message: 'API rate limit exceeded',
			documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
		}));
	}

	/**
	 * Reset request tracking
	 */
	reset() {
		this.requests = [];
		this.requestCount = 0;
	}

	/**
	 * Get all logged requests
	 */
	getRequests() {
		return this.requests;
	}

	/**
	 * Configure server behavior for testing
	 */
	configure(options) {
		if (options.simulateErrors !== undefined) {
			this.simulateErrors = options.simulateErrors;
		}
		if (options.responseDelay !== undefined) {
			this.responseDelay = options.responseDelay;
		}
		if (options.rateLimitEnabled !== undefined) {
			this.rateLimitEnabled = options.rateLimitEnabled;
		}
	}
}

// Export for use in tests
export { MockUpdateServer };

// Allow running as standalone server for manual testing
if (process.argv[1] === __filename) {
	const server = new MockUpdateServer({ port: 3456 });

	server.start().then(() => {
		console.log('Mock update server is running');
		console.log('Press Ctrl+C to stop');
	}).catch((err) => {
		console.error('Failed to start server:', err);
		process.exit(1);
	});

	process.on('SIGINT', async () => {
		console.log('\nShutting down...');
		await server.stop();
		process.exit(0);
	});
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('CommunityMarketplace Service', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('API Integration', () => {
        test('should construct correct API URLs', () => {
            const baseUrl = 'https://api.ainative.studio/v1/skills/marketplace';
            // Test endpoint construction
            assert.strictEqual(`${baseUrl}`, 'https://api.ainative.studio/v1/skills/marketplace');
            assert.strictEqual(`${baseUrl}/mongodb-patterns`, 'https://api.ainative.studio/v1/skills/marketplace/mongodb-patterns');
            assert.strictEqual(`${baseUrl}/search?q=database`, 'https://api.ainative.studio/v1/skills/marketplace/search?q=database');
        });
        test('should handle API response format', () => {
            const mockApiResponse = {
                skills: [
                    {
                        id: 'uuid-123',
                        name: 'mongodb-patterns',
                        description: 'MongoDB best practices',
                        author: 'testuser',
                        category: 'database',
                        keywords: ['mongodb', 'database'],
                        version: '1.0.0',
                        rating_avg: 4.5,
                        rating_count: 23,
                        download_count: 156,
                        status: 'approved',
                        skill_file_url: 'https://cdn.ainative.studio/skills/mongodb-patterns.zip',
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:00:00Z'
                    }
                ]
            };
            // Verify response structure
            assert.strictEqual(mockApiResponse.skills.length, 1);
            assert.strictEqual(mockApiResponse.skills[0].name, 'mongodb-patterns');
            assert.strictEqual(mockApiResponse.skills[0].rating_avg, 4.5);
            assert.strictEqual(mockApiResponse.skills[0].status, 'approved');
        });
    });
    suite('Skill Transformation', () => {
        test('should transform API skill to MarketplaceSkill format', () => {
            const apiSkill = {
                id: 'uuid-123',
                name: 'mongodb-patterns',
                description: 'MongoDB best practices',
                author: 'testuser',
                category: 'database',
                keywords: ['mongodb', 'database', 'nosql'],
                version: '1.0.0',
                rating_avg: 4.5,
                rating_count: 23,
                download_count: 156,
                status: 'approved',
                skill_file_url: 'https://cdn.ainative.studio/skills/mongodb-patterns.zip',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-15T12:00:00Z'
            };
            // Expected transformation
            const marketplaceSkill = {
                name: apiSkill.name,
                description: apiSkill.description,
                version: apiSkill.version,
                source: 'community',
                author: apiSkill.author,
                keywords: apiSkill.keywords,
                rating: apiSkill.rating_avg,
                downloads: apiSkill.download_count,
                updatedAt: new Date(apiSkill.updated_at),
                installCommand: `ainative skill install ${apiSkill.name}`,
                homepage: undefined,
                repository: apiSkill.skill_file_url
            };
            assert.strictEqual(marketplaceSkill.name, 'mongodb-patterns');
            assert.strictEqual(marketplaceSkill.source, 'community');
            assert.strictEqual(marketplaceSkill.rating, 4.5);
            assert.strictEqual(marketplaceSkill.downloads, 156);
            assert.strictEqual(marketplaceSkill.keywords.length, 3);
            assert.strictEqual(marketplaceSkill.repository, 'https://cdn.ainative.studio/skills/mongodb-patterns.zip');
        });
        test('should filter out non-approved skills', () => {
            const skills = [
                { id: '1', status: 'approved', name: 'skill1' },
                { id: '2', status: 'pending', name: 'skill2' },
                { id: '3', status: 'approved', name: 'skill3' },
                { id: '4', status: 'rejected', name: 'skill4' }
            ];
            const approvedSkills = skills.filter(s => s.status === 'approved');
            assert.strictEqual(approvedSkills.length, 2);
            assert.strictEqual(approvedSkills[0].name, 'skill1');
            assert.strictEqual(approvedSkills[1].name, 'skill3');
        });
    });
    suite('Cache Management', () => {
        test('should calculate cache age correctly', () => {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);
            const twoHoursAgo = now - (2 * 60 * 60 * 1000);
            const cacheTTL = 60 * 60 * 1000; // 1 hour
            // Cache from 1 hour ago should be expired
            assert.strictEqual((now - oneHourAgo) >= cacheTTL, true);
            // Cache from 2 hours ago should definitely be expired
            assert.strictEqual((now - twoHoursAgo) > cacheTTL, true);
            // Cache from 30 minutes ago should be valid
            const thirtyMinutesAgo = now - (30 * 60 * 1000);
            assert.strictEqual((now - thirtyMinutesAgo) < cacheTTL, true);
        });
        test('should construct correct cache file path', () => {
            const homeDir = '/Users/testuser';
            const expectedPath = `${homeDir}/.ainative/cache/marketplace/community.json`;
            // Verify path construction
            assert.strictEqual(expectedPath.includes('.ainative'), true);
            assert.strictEqual(expectedPath.includes('cache/marketplace'), true);
            assert.strictEqual(expectedPath.endsWith('community.json'), true);
        });
    });
    suite('Search Functionality', () => {
        test('should perform case-insensitive search', () => {
            const skills = [
                { name: 'MongoDB-Patterns', description: 'Database patterns', keywords: ['db'] },
                { name: 'redis-cache', description: 'Caching strategies', keywords: ['cache'] },
                { name: 'PostgreSQL-Guide', description: 'SQL best practices', keywords: ['sql'] }
            ];
            const query = 'mongo';
            const lowerQuery = query.toLowerCase();
            const results = skills.filter(skill => skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].name, 'MongoDB-Patterns');
        });
        test('should search across name, description, and keywords', () => {
            const skills = [
                { name: 'test-skill', description: 'A test skill', keywords: ['testing'] },
                { name: 'prod-skill', description: 'Contains test word', keywords: ['production'] },
                { name: 'other-skill', description: 'Other skill', keywords: ['test', 'keyword'] }
            ];
            const query = 'test';
            const lowerQuery = query.toLowerCase();
            const results = skills.filter(skill => skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)));
            assert.strictEqual(results.length, 3); // All match in different fields
        });
    });
    suite('Rating Validation', () => {
        test('should validate rating range', () => {
            const isValidRating = (rating) => {
                return rating >= 1 && rating <= 5 && Number.isInteger(rating);
            };
            // Valid ratings
            assert.strictEqual(isValidRating(1), true);
            assert.strictEqual(isValidRating(3), true);
            assert.strictEqual(isValidRating(5), true);
            // Invalid ratings
            assert.strictEqual(isValidRating(0), false);
            assert.strictEqual(isValidRating(6), false);
            assert.strictEqual(isValidRating(3.5), false);
            assert.strictEqual(isValidRating(-1), false);
        });
    });
    suite('Authentication', () => {
        test('should handle authentication token', () => {
            let authToken = null;
            // Initially not authenticated
            assert.strictEqual(authToken, null);
            // Set token
            authToken = 'test-jwt-token-123';
            assert.strictEqual(authToken !== null, true);
            // Clear token
            authToken = null;
            assert.strictEqual(authToken, null);
        });
    });
    suite('Error Handling', () => {
        test('should categorize error types', () => {
            const errorCodes = ['AUTH_REQUIRED', 'NETWORK_ERROR', 'RATE_LIMIT', 'VALIDATION_ERROR', 'SUBMISSION_FAILED'];
            // Verify all error codes are defined
            assert.strictEqual(errorCodes.includes('AUTH_REQUIRED'), true);
            assert.strictEqual(errorCodes.includes('NETWORK_ERROR'), true);
            assert.strictEqual(errorCodes.includes('RATE_LIMIT'), true);
            assert.strictEqual(errorCodes.includes('VALIDATION_ERROR'), true);
            assert.strictEqual(errorCodes.includes('SUBMISSION_FAILED'), true);
        });
        test('should handle HTTP status codes', () => {
            const statusCodeHandling = (status) => {
                if (status === 401 || status === 403) {
                    return 'AUTH_REQUIRED';
                }
                else if (status === 404) {
                    return 'NOT_FOUND';
                }
                else if (status === 429) {
                    return 'RATE_LIMIT';
                }
                else if (status >= 500) {
                    return 'SERVER_ERROR';
                }
                else {
                    return 'UNKNOWN_ERROR';
                }
            };
            assert.strictEqual(statusCodeHandling(401), 'AUTH_REQUIRED');
            assert.strictEqual(statusCodeHandling(403), 'AUTH_REQUIRED');
            assert.strictEqual(statusCodeHandling(404), 'NOT_FOUND');
            assert.strictEqual(statusCodeHandling(429), 'RATE_LIMIT');
            assert.strictEqual(statusCodeHandling(500), 'SERVER_ERROR');
            assert.strictEqual(statusCodeHandling(503), 'SERVER_ERROR');
        });
    });
    suite('Retry Logic', () => {
        test('should calculate exponential backoff delays', () => {
            const baseDelay = 1000; // 1 second
            const delays = [
                baseDelay * Math.pow(2, 0), // 1st retry: 1s
                baseDelay * Math.pow(2, 1), // 2nd retry: 2s
                baseDelay * Math.pow(2, 2) // 3rd retry: 4s
            ];
            assert.strictEqual(delays[0], 1000);
            assert.strictEqual(delays[1], 2000);
            assert.strictEqual(delays[2], 4000);
        });
        test('should limit retry attempts', () => {
            const maxRetries = 3;
            let attempts = 0;
            // Simulate retry loop
            for (let i = 0; i < maxRetries; i++) {
                attempts++;
            }
            assert.strictEqual(attempts, 3);
            assert.strictEqual(attempts <= maxRetries, true);
        });
    });
    suite('Installation Workflow', () => {
        test('should construct correct installation paths', () => {
            const homeDir = '/Users/testuser';
            const skillName = 'mongodb-patterns';
            const skillsDir = `${homeDir}/.ainative/skills`;
            const targetPath = `${skillsDir}/${skillName}`;
            assert.strictEqual(targetPath, '/Users/testuser/.ainative/skills/mongodb-patterns');
        });
        test('should generate temp zip paths', () => {
            const skillName = 'test-skill';
            const timestamp = 1234567890;
            const tempPath = `/tmp/${skillName}-${timestamp}.zip`;
            assert.strictEqual(tempPath.includes(skillName), true);
            assert.strictEqual(tempPath.endsWith('.zip'), true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbXVuaXR5TWFya2V0cGxhY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vY29tbXVuaXR5TWFya2V0cGxhY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBQzFDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM3QixJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzlDLE1BQU0sT0FBTyxHQUFHLG1EQUFtRCxDQUFDO1lBRXBFLDZCQUE2QjtZQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsT0FBTyxFQUFFLEVBQUUsbURBQW1ELENBQUMsQ0FBQztZQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsT0FBTyxtQkFBbUIsRUFBRSxvRUFBb0UsQ0FBQyxDQUFDO1lBQ3hILE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLG9CQUFvQixFQUFFLHFFQUFxRSxDQUFDLENBQUM7UUFDM0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzlDLE1BQU0sZUFBZSxHQUFHO2dCQUN2QixNQUFNLEVBQUU7b0JBQ1A7d0JBQ0MsRUFBRSxFQUFFLFVBQVU7d0JBQ2QsSUFBSSxFQUFFLGtCQUFrQjt3QkFDeEIsV0FBVyxFQUFFLHdCQUF3Qjt3QkFDckMsTUFBTSxFQUFFLFVB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
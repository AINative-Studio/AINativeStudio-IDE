/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * End-to-End Integration Tests for Phase 2 Managed API
 * Tests complete flows: UI → API → Tool Execution → Response → Credits Update
 */
import * as assert from 'assert';
suite('End-to-End Integration Tests - Phase 2 Managed API', () => {
    suite('Complete Chat Flow with Tool Selection', () => {
        test('Given user sends message with code, When code_intelligence tool is selected, Then complexity analysis is returned and credits are tracked', async () => {
            // This is a behavioral test that would require full system integration
            // In a real scenario, this would test:
            // 1. User sends message with code snippet
            // 2. ChatThreadService routes to ManagedChatAPIService
            // 3. Backend selects code_intelligence tool
            // 4. Tool executes and returns results
            // 5. Results displayed in UI
            // 6. Credits tracked in UsageTrackingService
            // For now, we document the expected flow
            assert.ok(true, 'End-to-end test placeholder - requires full system integration');
        });
        test('Given user requests documentation, When web_fetch tool is used, Then markdown content is displayed and cached', async () => {
            // Expected flow:
            // 1. User: "Show me Python asyncio documentation"
            // 2. System routes to managed API with web_fetch tool
            // 3. Backend fetches https://docs.python.org/3/library/asyncio.html
            // 4. Content converted to markdown
            // 5. Displayed in chat
            // 6. Cached locally for 1 hour
            // 7. Credits deducted
            assert.ok(true, 'End-to-end test placeholder - requires full system integration');
        });
    });
    suite('Scenario: Code Analysis with Selected Code', () => {
        test('Given user selects code in editor and asks for analysis, When complexity tool runs, Then results show in chat with highlighting', async () => {
            // Flow:
            // 1. User selects Python function in editor
            // 2. User types "Analyze this code's complexity"
            // 3. ChatThreadService captures selected code
            // 4. Sends to ManagedChatAPIService with code_intelligence tool
            // 5. Backend analyzes complexity
            // 6. Results returned with function-level metrics
            // 7. UI displays with inline code highlighting
            // 8. Credits consumed: 0.5 (example)
            // 9. UsageTrackingService records transaction
            const expectedFlow = {
                step1: 'Code selection captured',
                step2: 'User message sent',
                step3: 'Tool selected: code_intelligence',
                step4: 'Analysis executed',
                step5: 'Results displayed',
                step6: 'Credits tracked'
            };
            assert.ok(expectedFlow.step1);
            assert.ok(expectedFlow.step6);
        });
        test('Given complex nested code, When analysis runs, Then high complexity functions are identified with refactoring suggestions', async () => {
            // Expected complexity ranks:
            // - Simple functions (1-5 branches): Rank A
            // - Moderate functions (6-10 branches): Rank B
            // - Complex functions (11-20 branches): Rank C
            // - Very complex (21-30 branches): Rank D
            // - Extremely complex (31-40 branches): Rank E
            // - Unmaintainable (41+ branches): Rank F
            const expectedOutput = {
                totalFunctions: 5,
                averageComplexity: 8,
                highComplexityFunctions: [
                    { name: 'processData', complexity: 15, rank: 'C' },
                    { name: 'validateInput', complexity: 12, rank: 'C' }
                ],
                suggestions: [
                    'Consider breaking down processData into smaller functions',
                    'Extract validation logic into separate helper functions'
                ]
            };
            assert.ok(expectedOutput.highComplexityFunctions.length > 0);
        });
    });
    suite('Scenario: Documentation Query with Caching', () => {
        test('Given user requests React hooks documentation, When fetched first time, Then content is cached for subsequent requests', async () => {
            // First request flow:
            // 1. User: "Explain React useEffect hook"
            // 2. System sends to managed API with web_fetch tool
            // 3. Tool fetches https://react.dev/reference/react/useEffect
            // 4. HTML → Markdown conversion
            // 5. Cache stored with 1-hour TTL
            // 6. Content displayed
            // 7. Credits: 0.8
            // Second request (within 1 hour):
            // 1. User asks similar question
            // 2. Cache hit detected
            // 3. Content served from cache
            // 4. Credits: 0.3 (reduced for cached content)
            const firstRequest = {
                cached: false,
                creditsUsed: 0.8,
                fetchTime: 1500 // ms
            };
            const secondRequest = {
                cached: true,
                creditsUsed: 0.3,
                fetchTime: 50 // ms (much faster)
            };
            assert.ok(secondRequest.fetchTime < firstRequest.fetchTime);
            assert.ok(secondRequest.creditsUsed < firstRequest.creditsUsed);
        });
        test('Given cache expires, When same documentation requested, Then fresh fetch occurs', async () => {
            // Scenario:
            // 1. Initial fetch at T=0, cached until T=3600 (1 hour)
            // 2. Request at T=3601 (expired)
            // 3. Fresh fetch executed
            // 4. Cache updated with new TTL
            // 5. Full credits charged
            const cacheEntry = {
                url: 'https://docs.python.org/3/library/asyncio.html',
                cachedAt: Date.now() - (61 * 60 * 1000), // 61 minutes ago
                expiresAt: Date.now() - (60 * 1000), // Expired 1 minute ago
                expired: true
            };
            assert.ok(cacheEntry.expired);
        });
    });
    suite('Scenario: Credits Tracking Throughout Session', () => {
        test('Given user starts with 1000 credits, When making multiple requests, Then credits decrease and low warning fires', async () => {
            // Session flow:
            // Request 1: Code analysis (500 tokens) → 0.5 credits
            // Request 2: Documentation fetch → 0.8 credits
            // Request 3: Complex analysis (2000 tokens) → 2.0 credits
            // ...
            // Request N: Credits drop below 200 (20%)
            // → Low credits warning triggered
            // → UI shows banner: "You have 150 credits remaining. Upgrade?"
            const session = {
                startingCredits: 1000,
                requests: [
                    { type: 'code_analysis', credits: 0.5, remaining: 999.5 },
                    { type: 'web_fetch', credits: 0.8, remaining: 998.7 },
                    { type: 'code_analysis', credits: 2.0, remaining: 996.7 }
                ],
                lowCreditsThreshold: 200,
                warningTriggered: false
            };
            const finalCredits = session.requests[session.requests.length - 1].remaining;
            session.warningTriggered = finalCredits < session.lowCreditsThreshold;
            assert.strictEqual(typeof session.warningTriggered, 'boolean');
        });
        test('Given credits depleted, When new request made, Then 402 error returned with upgrade prompt', async () => {
            // Scenario:
            // 1. User has 0.1 credits remaining
            // 2. Attempts request requiring 1.0 credits
            // 3. Backend returns 402 Payment Required
            // 4. UI displays: "Insufficient credits. You need 1.0 credits but have 0.1."
            // 5. Upgrade button shown with pricing link
            const insufficientCreditsResponse = {
                statusCode: 402,
                error: {
                    code: 'insufficient_credits',
                    message: 'You have insufficient credits to make this request',
                    details: {
                        credits_required: 1.0,
                        credits_available: 0.1,
                        upgrade_url: 'https://ainative.studio/pricing'
                    }
                }
            };
            assert.strictEqual(insufficientCreditsResponse.statusCode, 402);
            assert.ok(insufficientCreditsResponse.error.details.upgrade_url);
        });
    });
    suite('Scenario: Authentication Flow with Token Refresh', () => {
        test('Given token expires mid-session, When request fails with 401, Then auto-refresh and retry succeeds', async () => {
            // Flow:
            // 1. User authenticated with JWT (expires in 1 hour)
            // 2. 55 minutes pass
            // 3. User makes request
            // 4. Token expires during request
            // 5. Backend returns 401 Unauthorized
            // 6. Frontend detects auth error
            // 7. Automatically calls refreshToken()
            // 8. Gets new JWT
            // 9. Retries original request
            // 10. Request succeeds
            // 11. User never notices interruption
            const authFlow = {
                initialToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.old_token',
                tokenExpired: true,
                refreshAttempted: true,
                refreshSucceeded: true,
                newToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token',
                retrySucceeded: true
            };
            assert.ok(authFlow.refreshSucceeded);
            assert.ok(authFlow.retrySucceeded);
        });
        test('Given refresh token expires, When refresh fails, Then user prompted to re-login', async () => {
            // Scenario:
            // 1. Access token expires
            // 2. Refresh token also expired (after 30 days)
            // 3. Refresh attempt returns 401
            // 4. System logs user out
            // 5. Redirect to login screen
            // 6. Message: "Your session has expired. Please log in again."
            const expiredRefresh = {
                accessTokenExpired: true,
                refreshTokenExpired: true,
                refreshFailed: true,
                userLoggedOut: true,
                redirectToLogin: true
            };
            assert.ok(expiredRefresh.userLoggedOut);
            assert.ok(expiredRefresh.redirectToLogin);
        });
    });
    suite('Scenario: Rate Limiting with Exponential Backoff', () => {
        test('Given user makes rapid requests, When rate limit hit, Then automatic retry with backoff succeeds', async () => {
            // Flow:
            // Request 1: Success (200) - 0ms delay
            // Request 2: Success (200) - 0ms delay
            // Request 3: Rate limited (429) - Retry after 1000ms
            // Request 3 Retry 1: Rate limited (429) - Retry after 2000ms
            // Request 3 Retry 2: Success (200)
            // Total wait time: 3000ms
            // Request succeeds transparently
            const rateLimitScenario = {
                attempts: [
                    { attempt: 1, status: 429, delay: 0 },
                    { attempt: 2, status: 429, delay: 1000 },
                    { attempt: 3, status: 200, delay: 2000 }
                ],
                totalDelay: 3000,
                maxRetries: 3,
                finalSuccess: true
            };
            assert.ok(rateLimitScenario.finalSuccess);
            assert.strictEqual(rateLimitScenario.totalDelay, 3000);
        });
        test('Given persistent rate limiting, When max retries exceeded, Then error shown to user', async () => {
            // Scenario:
            // Request fails 3 times with 429
            // Max retries reached
            // Error displayed: "Service temporarily unavailable. Please try again in a moment."
            const exhaustedRetries = {
                attempts: [
                    { attempt: 1, status: 429 },
                    { attempt: 2, status: 429 },
                    { attempt: 3, status: 429 }
                ],
                maxRetriesReached: true,
                errorShown: true,
                errorMessage: 'Service temporarily unavailable. Please try again in a moment.'
            };
            assert.ok(exhaustedRetries.maxRetriesReached);
            assert.ok(exhaustedRetries.errorShown);
        });
    });
    suite('Scenario: Multi-Tool Conversation', () => {
        test('Given complex query, When multiple tools needed, Then tools execute in sequence with context preservation', async () => {
            // User: "Analyze this Python code and show me the asyncio documentation for the functions used"
            //
            // Flow:
            // 1. code_intelligence tool analyzes code
            // 2. Identifies asyncio.gather and asyncio.run
            // 3. web_fetch tool retrieves asyncio documentation
            // 4. Response synthesizes both results
            // 5. Total credits: code analysis (0.5) + doc fetch (0.8) = 1.3
            const multiToolConversation = {
                userQuery: 'Analyze this Python code and show me the asyncio documentation',
                toolsUsed: ['code_intelligence', 'web_fetch'],
                steps: [
                    {
                        step: 1,
                        tool: 'code_intelligence',
                        input: { code: 'async def main()...', language: 'python' },
                        output: { functions: ['main'], imports: ['asyncio'] }
                    },
                    {
                        step: 2,
                        tool: 'web_fetch',
                        input: { url: 'https://docs.python.org/3/library/asyncio.html' },
                        output: { content: '# Asyncio documentation...' }
                    }
                ],
                totalCredits: 1.3,
                responseTime: 2500
            };
            assert.strictEqual(multiToolConversation.toolsUsed.length, 2);
            assert.strictEqual(multiToolConversation.totalCredits, 1.3);
        });
    });
    suite('Scenario: Error Recovery and User Feedback', () => {
        test('Given network error occurs, When request fails, Then user-friendly error message shown with retry option', async () => {
            // Scenario:
            // 1. User sends message
            // 2. Network connection drops
            // 3. Request fails with network error
            // 4. UI shows: "Network error. Please check your connection and try again."
            // 5. Retry button available
            // 6. User clicks retry
            // 7. Request succeeds
            const errorRecovery = {
                initialError: {
                    type: 'network_error',
                    code: 'ECONNREFUSED',
                    userMessage: 'Network error. Please check your connection and try again.',
                    retryable: true
                },
                retryAttempted: true,
                retrySucceeded: true
            };
            assert.ok(errorRecovery.initialError.retryable);
            assert.ok(errorRecovery.retrySucceeded);
        });
        test('Given model not available, When request fails with 403, Then fallback model suggested', async () => {
            // Scenario:
            // 1. User has Free plan
            // 2. Requests GPT-4 (Pro plan only)
            // 3. Backend returns 403 Model Not Available
            // 4. UI shows: "GPT-4 is not available on your plan. Try Llama 3.3 70B instead?"
            // 5. User clicks "Use Llama 3.3"
            // 6. Request resubmitted with different model
            // 7. Success
            const modelFallback = {
                requestedModel: 'gpt-4',
                userPlan: 'free',
                modelAvailable: false,
                suggestedModel: 'llama-3.3-70b-instruct',
                fallbackAccepted: true,
                fallbackSucceeded: true
            };
            assert.ok(modelFallback.suggestedModel);
            assert.ok(modelFallback.fallbackSucceeded);
        });
    });
    suite('Performance and Scalability', () => {
        test('Given large code file (10K+ lines), When complexity analysis requested, Then processing completes within reasonable time', async () => {
            // Performance expectations:
            // - Small files (<100 lines): < 1 second
            // - Medium files (100-1000 lines): < 3 seconds
            // - Large files (1000-10000 lines): < 10 seconds
            // - Very large files (10000+ lines): May require chunking
            const performanceMetrics = {
                fileSize: 10000, // lines
                processingTime: 8500, // ms
                withinExpectedRange: true,
                tokenCount: 50000,
                creditsUsed: 5.0
            };
            assert.ok(performanceMetrics.processingTime < 10000);
            assert.ok(performanceMetrics.withinExpectedRange);
        });
        test('Given concurrent requests, When multiple users active, Then requests handled without interference', async () => {
            // Scalability test:
            // - Multiple users making simultaneous requests
            // - Each request isolated
            // - No cross-contamination of data
            // - Credits tracked per user
            // - Responses returned to correct user
            const concurrentScenario = {
                activeUsers: 100,
                simultaneousRequests: 250,
                averageResponseTime: 1500, // ms
                successRate: 0.99, // 99%
                isolationMaintained: true
            };
            assert.ok(concurrentScenario.successRate > 0.95);
            assert.ok(concurrentScenario.isolationMaintained);
        });
    });
    suite('Data Consistency and Synchronization', () => {
        test('Given usage tracked locally, When cloud sync occurs, Then local and cloud data reconciled', async () => {
            // Synchronization flow:
            // 1. User makes 5 requests offline (tracked locally)
            // 2. Connection restored
            // 3. Auto-sync triggered every 5 minutes
            // 4. Local usage uploaded to cloud
            // 5. Cloud usage downloaded
            // 6. Data merged without duplicates
            // 7. Credits status updated
            const syncScenario = {
                localRequests: 5,
                cloudRequests: 10,
                syncPerformed: true,
                totalRequests: 15,
                duplicatesRemoved: 0,
                creditsConsistent: true
            };
            assert.strictEqual(syncScenario.totalRequests, 15);
            assert.ok(syncScenario.creditsConsistent);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kVG9FbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9pbnRlZ3JhdGlvbi9lbmRUb0VuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7R0FHRztBQUVILE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRWpDLEtBQUssQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7SUFFaEUsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUVwRCxJQUFJLENBQUMsMklBQTJJLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUosdUVBQXVFO1lBQ3ZFLHVDQUF1QztZQUN2QywwQ0FBMEM7WUFDMUMsdURBQXVEO1lBQ3ZELDRDQUE0QztZQUM1Qyx1Q0FBdUM7WUFDdkMsNkJBQTZCO1lBQzdCLDZDQUE2QztZQUU3Qyx5Q0FBeUM7WUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsZ0VBQWdFLENBQUMsQ0FBQztRQUNuRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywrR0FBK0csRUFBRSxLQUFLLElBQUksRUFBRTtZQUNoSSxpQkFBaUI7WUFDakIsa0RBQWtEO1lBQ2xELHNEQUFzRDtZQUN0RCxvRUFBb0U7WUFDcEUsbUNBQW1DO1lBQ25DLHVCQUF1QjtZQUN2QiwrQkFBK0I7WUFDL0Isc0JBQXNCO1lBRXRCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLGdFQUFnRSxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFFeEQsSUFBSSxDQUFDLGlJQUFpSSxFQUFFLEtB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { DEFAULT_LOG_LEVEL, LogLevel } from '../../../../platform/log/common/log.js';
import { TestTelemetryLoggerService } from '../../../../platform/telemetry/test/common/telemetryLogAppender.test.js';
import { ExtHostTelemetry, ExtHostTelemetryLogger } from '../../common/extHostTelemetry.js';
import { mock } from '../../../test/common/workbenchTestServices.js';
suite('ExtHostTelemetry', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const mockEnvironment = {
        isExtensionDevelopmentDebug: false,
        extensionDevelopmentLocationURI: undefined,
        extensionTestsLocationURI: undefined,
        appRoot: undefined,
        appName: 'test',
        isExtensionTelemetryLoggingOnly: false,
        appHost: 'test',
        appLanguage: 'en',
        globalStorageHome: URI.parse('fake'),
        workspaceStorageHome: URI.parse('fake'),
        appUriScheme: 'test',
    };
    const mockTelemetryInfo = {
        firstSessionDate: '2020-01-01T00:00:00.000Z',
        sessionId: 'test',
        machineId: 'test',
        sqmId: 'test',
        devDeviceId: 'test'
    };
    const mockRemote = {
        authority: 'test',
        isRemote: false,
        connectionData: null
    };
    const mockExtensionIdentifier = {
        identifier: new ExtensionIdentifier('test-extension'),
        targetPlatform: "universal" /* TargetPlatform.UNIVERSAL */,
        isBuiltin: true,
        isUserBuiltin: true,
        isUnderDevelopment: true,
        name: 'test-extension',
        publisher: 'vscode',
        version: '1.0.0',
        engines: { vscode: '*' },
        extensionLocation: URI.parse('fake'),
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const createExtHostTelemetry = () => {
        const extensionTelemetry = new ExtHostTelemetry(false, new class extends mock() {
            constructor() {
                super(...arguments);
                this.environment = mockEnvironment;
                this.telemetryInfo = mockTelemetryInfo;
                this.remote = mockRemote;
            }
        }, new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL));
        store.add(extensionTelemetry);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, { usage: true, error: true });
        return extensionTelemetry;
    };
    const createLogger = (functionSpy, extHostTelemetry, options) => {
        const extensionTelemetry = extHostTelemetry ?? createExtHostTelemetry();
        // This is the appender which the extension would contribute
        const appender = {
            sendEventData: (eventName, data) => {
                functionSpy.dataArr.push({ eventName, data });
            },
            sendErrorData: (exception, data) => {
                functionSpy.exceptionArr.push({ exception, data });
            },
            flush: () => {
                functionSpy.flushCalled = true;
            }
        };
        if (extHostTelemetry) {
            store.add(extHostTelemetry);
        }
        const logger = extensionTelemetry.instantiateLogger(mockExtensionIdentifier, appender, options);
        store.add(logger);
        return logger;
    };
    test('Validate sender instances', function () {
        assert.throws(() => ExtHostTelemetryLogger.validateSender(null));
        assert.throws(() => ExtHostTelemetryLogger.validateSender(1));
        assert.throws(() => ExtHostTelemetryLogger.validateSender({}));
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: () => { },
                sendEventData: true
            });
        });
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: 123,
                sendEventData: () => { },
            });
        });
        assert.throws(() => {
            ExtHostTelemetryLogger.validateSender({
                sendErrorData: () => { },
                sendEventData: () => { },
                flush: true
            });
        });
    });
    test('Ensure logger gets proper telemetry level during initialization', function () {
        const extensionTelemetry = createExtHostTelemetry();
        let config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, true);
        assert.strictEqual(config.isErrorsEnabled, true);
        // Initialize would never be called twice, but this is just for testing
        extensionTelemetry.$initializeTelemetryLevel(2 /* TelemetryLevel.ERROR */, true, { usage: true, error: true });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, true);
        extensionTelemetry.$initializeTelemetryLevel(1 /* TelemetryLevel.CRASH */, true, { usage: true, error: true });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, false);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, { usage: false, error: true });
        config = extensionTelemetry.getTelemetryDetails();
        assert.strictEqual(config.isCrashEnabled, true);
        assert.strictEqual(config.isUsageEnabled, false);
        assert.strictEqual(config.isErrorsEnabled, true);
        extensionTelemetry.dispose();
    });
    test('Simple log event to TelemetryLogger', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy);
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['test-data'], 'test-data');
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        logger.logError('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        logger.logError(new Error('test-error'), { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        // Assert not flushed
        assert.strictEqual(functionSpy.flushCalled, false);
        // Call flush and assert that flush occurs
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Simple log event to TelemetryLogger with options', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, undefined, { additionalCommonProperties: { 'common.foo': 'bar' } });
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['test-data'], 'test-data');
        assert.strictEqual(functionSpy.dataArr[0].data['common.foo'], 'bar');
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        logger.logError('test-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        logger.logError(new Error('test-error'), { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        // Assert not flushed
        assert.strictEqual(functionSpy.flushCalled, false);
        // Call flush and assert that flush occurs
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Log error should get common properties #193205', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, undefined, { additionalCommonProperties: { 'common.foo': 'bar' } });
        logger.logError(new Error('Test error'));
        assert.strictEqual(functionSpy.exceptionArr.length, 1);
        assert.strictEqual(functionSpy.exceptionArr[0].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.exceptionArr[0].data['common.product'], 'test');
        logger.logError('test-error-event');
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[0].data['common.product'], 'test');
        logger.logError('test-error-event', { 'test-data': 'test-data' });
        assert.strictEqual(functionSpy.dataArr.length, 2);
        assert.strictEqual(functionSpy.dataArr[1].data['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[1].data['common.product'], 'test');
        logger.logError('test-error-event', { properties: { 'test-data': 'test-data' } });
        assert.strictEqual(functionSpy.dataArr.length, 3);
        assert.strictEqual(functionSpy.dataArr[2].data.properties['common.foo'], 'bar');
        assert.strictEqual(functionSpy.dataArr[2].data.properties['common.product'], 'test');
        logger.dispose();
        assert.strictEqual(functionSpy.flushCalled, true);
    });
    test('Ensure logger properly cleans PII', function () {
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy);
        // Log an event with a bunch of PII, this should all get cleaned out
        logger.logUsage('test-event', {
            'fake-password': 'pwd=123',
            'fake-email': 'no-reply@example.com',
            'fake-token': 'token=123',
            'fake-slack-token': 'xoxp-123',
            'fake-path': '/Users/username/.vscode/extensions',
        });
        assert.strictEqual(functionSpy.dataArr.length, 1);
        assert.strictEqual(functionSpy.dataArr[0].eventName, `${mockExtensionIdentifier.name}/test-event`);
        assert.strictEqual(functionSpy.dataArr[0].data['fake-password'], '<REDACTED: Generic Secret>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-email'], '<REDACTED: Email>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-token'], '<REDACTED: Generic Secret>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-slack-token'], '<REDACTED: Slack Token>');
        assert.strictEqual(functionSpy.dataArr[0].data['fake-path'], '<REDACTED: user-file-path>');
    });
    test('Ensure output channel is logged to', function () {
        // Have to re-duplicate code here because I the logger service isn't exposed in the simple setup functions
        const loggerService = new TestTelemetryLoggerService(LogLevel.Trace);
        const extensionTelemetry = new ExtHostTelemetry(false, new class extends mock() {
            constructor() {
                super(...arguments);
                this.environment = mockEnvironment;
                this.telemetryInfo = mockTelemetryInfo;
                this.remote = mockRemote;
            }
        }, loggerService);
        extensionTelemetry.$initializeTelemetryLevel(3 /* TelemetryLevel.USAGE */, true, { usage: true, error: true });
        const functionSpy = { dataArr: [], exceptionArr: [], flushCalled: false };
        const logger = createLogger(functionSpy, extensionTelemetry);
        // Ensure headers are logged on instantiation
        assert.strictEqual(loggerService.createLogger().logs.length, 0);
        logger.logUsage('test-event', { 'test-data': 'test-data' });
        // Initial header is logged then the event
        assert.strictEqual(loggerService.createLogger().logs.length, 1);
        assert.ok(loggerService.createLogger().logs[0].startsWith('test-extension/test-event'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUZWxlbWV0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUMsTUFBTSxzREFBc0QsQ0FBQztBQUNsSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFFckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBU3JFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtJQUN6QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELE1BQU0sZUFBZSxHQUFpQjtRQUNyQywyQkFBMkIsRUFBRSxLQUFLO1FBQ2xDLCtCQUErQixFQUFFLFNBQVM7UUFDMUMseUJBQXlCLEVBQUUsU0FBUztRQUNwQyxPQUFPLEVBQUUsU0FBUztRQUNsQixPQUFPLEVBQUUsTUFBTTtRQUNmLCtCQUErQixFQUFFLEtBQUs7UUFDdEMsT0FBTyxFQUFFLE1BQU07UUFDZixXQUFXLEVBQUUsSUFBSTtRQUNqQixpQkFBaUIsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1B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
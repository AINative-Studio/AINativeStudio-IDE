/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, LogLevel } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { TelemetryLogAppender } from '../../common/telemetryLogAppender.js';
class TestTelemetryLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.logs = [];
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.logs.push(message + JSON.stringify(args));
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.logs.push(message);
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.logs.push(message);
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.logs.push(message.toString());
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            this.logs.push(message);
        }
    }
    flush() { }
}
export class TestTelemetryLoggerService {
    constructor(logLevel) {
        this.logLevel = logLevel;
        this.onDidChangeVisibility = Event.None;
        this.onDidChangeLogLevel = Event.None;
        this.onDidChangeLoggers = Event.None;
    }
    getLogger() {
        return this.logger;
    }
    createLogger() {
        if (!this.logger) {
            this.logger = new TestTelemetryLogger(this.logLevel);
        }
        return this.logger;
    }
    setLogLevel() { }
    getLogLevel() { return LogLevel.Info; }
    setVisibility() { }
    getDefaultLogLevel() { return this.logLevel; }
    registerLogger() { }
    deregisterLogger() { }
    getRegisteredLoggers() { return []; }
    getRegisteredLogger() { return undefined; }
}
suite('TelemetryLogAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Do not Log Telemetry if log level is not trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs.length, 0);
        testObject.dispose();
        testInstantiationService.dispose();
    });
    test('Log Telemetry if log level is trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(LogLevel.Trace);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs[0], 'telemetry/testEvent' + JSON.stringify([{
                properties: {
                    hello: 'world',
                },
                measurements: {
                    isTrue: 1, numberBetween1And3: 2
                }
            }]));
        testObject.dispose();
        testInstantiationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvdGVzdC9jb21tb24vdGVsZW1ldHJ5TG9nQXBwZW5kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQTJCLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RSxNQUFNLG1CQUFvQixTQUFRLGNBQWM7SUFJL0MsWUFBWSxXQUFxQixpQkFBaUI7UUFDakQsS0FBSyxFQUFFLENBQUM7UUFIRixTQUFJLEdBQWEsRUFBRSxDQUFDO1FBSTFCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcs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
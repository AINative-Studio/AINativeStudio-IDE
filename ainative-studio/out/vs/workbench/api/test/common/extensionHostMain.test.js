/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { errorHandler, onUnexpectedError } from '../../../../base/common/errors.js';
import { isFirefox, isSafari } from '../../../../base/common/platform.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { InstantiationService } from '../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { ExtensionPaths, IExtHostExtensionService } from '../../common/extHostExtensionService.js';
import { IExtHostRpcService } from '../../common/extHostRpcService.js';
import { IExtHostTelemetry } from '../../common/extHostTelemetry.js';
import { ErrorHandler } from '../../common/extensionHostMain.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
suite('ExtensionHostMain#ErrorHandler - Wrapping prepareStackTrace can cause slowdown and eventual stack overflow #184926 ', function () {
    if (isFirefox || isSafari) {
        return;
    }
    const extensionsIndex = TernarySearchTree.forUris();
    const mainThreadExtensionsService = new class extends mock() {
        $onExtensionRuntimeError(extensionId, data) {
        }
        $onUnexpectedError(err) {
        }
    };
    const collection = new ServiceCollection([ILogService, new NullLogService()], [IExtHostTelemetry, new class extends mock() {
            onExtensionError(extension, error) {
                return true;
            }
        }], [IExtHostExtensionService, new class extends mock() {
            getExtensionPathIndex() {
                return new class extends ExtensionPaths {
                    findSubstr(key) {
                        findSubstrCount++;
                        return nullExtensionDescription;
                    }
                }(extensionsIndex);
            }
        }], [IExtHostRpcService, new class extends mock() {
            getProxy(identifier) {
                return mainThreadExtensionsService;
            }
        }]);
    const originalPrepareStackTrace = Error.prepareStackTrace;
    const insta = new InstantiationService(collection, false);
    let existingErrorHandler;
    let findSubstrCount = 0;
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(async function () {
        existingErrorHandler = errorHandler.getUnexpectedErrorHandler();
        await insta.invokeFunction(ErrorHandler.installFullHandler);
    });
    suiteTeardown(function () {
        errorHandler.setUnexpectedErrorHandler(existingErrorHandler);
    });
    setup(async function () {
        findSubstrCount = 0;
    });
    teardown(() => {
        Error.prepareStackTrace = originalPrepareStackTrace;
    });
    test('basics', function () {
        const err = new Error('test1');
        onUnexpectedError(err);
        assert.strictEqual(findSubstrCount, 1);
    });
    test('set/reset prepareStackTrace-callback', function () {
        const original = Error.prepareStackTrace;
        Error.prepareStackTrace = (_error, _stack) => 'stack';
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.ok(stack);
        Error.prepareStackTrace = original;
        assert.strictEqual(findSubstrCount, 1);
        // already checked
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
        // one more error
        const err = new Error('test2');
        onUnexpectedError(err);
        assert.strictEqual(findSubstrCount, 2);
    });
    test('wrap prepareStackTrace-callback', function () {
        function do_something_else(params) {
            return params;
        }
        const original = Error.prepareStackTrace;
        Error.prepareStackTrace = (...args) => {
            return do_something_else(original?.(...args));
        };
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.ok(stack);
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
    });
    test('prevent rewrapping', function () {
        let do_something_count = 0;
        function do_something(params) {
            do_something_count++;
        }
        Error.prepareStackTrace = (result, stack) => {
            do_something(stack);
            return 'fakestack';
        };
        for (let i = 0; i < 2_500; ++i) {
            Error.prepareStackTrace = Error.prepareStackTrace;
        }
        const probeErr = new Error();
        const stack = probeErr.stack;
        assert.strictEqual(stack, 'fakestack');
        onUnexpectedError(probeErr);
        assert.strictEqual(findSubstrCount, 1);
        const probeErr2 = new Error();
        onUnexpectedError(probeErr2);
        assert.strictEqual(findSubstrCount, 2);
        assert.strictEqual(do_something_count, 2);
    });
    suite('https://gist.github.com/thecrypticace/f0f2e182082072efdaf0f8e1537d2cce', function () {
        test("Restored, separate operations", () => {
            // Actual Test
            let original;
            // Operation 1
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            const err1 = new Error();
            assert.ok(err1.stack);
            assert.strictEqual(findSubstrCount, 1);
            Error.prepareStackTrace = original;
            // Operation 2
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 2);
            Error.prepareStackTrace = original;
            // Operation 3
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 3);
            Error.prepareStackTrace = original;
            // Operation 4
            original = Error.prepareStackTrace;
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            assert.strictEqual(findSubstrCount, 4);
            Error.prepareStackTrace = original;
            // Back to Operation 1
            assert.ok(err1.stack);
            assert.strictEqual(findSubstrCount, 4);
        });
        test("Never restored, separate operations", () => {
            // Operation 1
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 2
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 3
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            // Operation 4
            for (let i = 0; i < 12_500; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
        });
        test("Restored, too many uses before restoration", async () => {
            const original = Error.prepareStackTrace;
            Error.prepareStackTrace = (_, stack) => stack;
            // Operation 1 — more uses of `prepareStackTrace`
            for (let i = 0; i < 10_000; ++i) {
                Error.prepareStackTrace = Error.prepareStackTrace;
            }
            assert.ok(new Error().stack);
            Error.prepareStackTrace = original;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vZXh0ZW5zaW9uSG9zdE1haW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFtQixZQUFZLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFJN0YsS0FBSyxDQUFDLHFI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
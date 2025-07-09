/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers, timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { EmptyExtension, ExtensionActivationTimes, ExtensionsActivator } from '../../common/extHostExtensionActivator.js';
import { ExtensionDescriptionRegistry } from '../../../services/extensions/common/extensionDescriptionRegistry.js';
suite('ExtensionsActivator', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const idA = new ExtensionIdentifier(`a`);
    const idB = new ExtensionIdentifier(`b`);
    const idC = new ExtensionIdentifier(`c`);
    test('calls activate only once with sequential activations', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA)
        ]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('calls activate only once with parallel activations', async () => {
        const extActivation = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivation]
        ]);
        const activator = createActivator(host, [
            desc(idA, [], ['evt1', 'evt2'])
        ]);
        const activate1 = activator.activateByEvent('evt1', false);
        const activate2 = activator.activateByEvent('evt2', false);
        extActivation.resolve();
        await activate1;
        await activate2;
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('activates dependencies first', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB], ['evt1']),
            desc(idB, [], ['evt1']),
        ]);
        const activate = activator.activateByEvent('evt1', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await timeout(0);
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
    });
    test('Supports having resolved extensions', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const bExt = desc(idB);
        delete bExt.main;
        delete bExt.browser;
        const activator = createActivator(host, [
            desc(idA, [idB])
        ], [bExt]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('Supports having external extensions', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const bExt = desc(idB);
        bExt.api = 'none';
        const activator = createActivator(host, [
            desc(idA, [idB])
        ], [bExt]);
        const activate = activator.activateByEvent('*', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
    });
    test('Error: activateById with missing extension', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA),
            desc(idB),
        ]);
        let error = undefined;
        try {
            await activator.activateById(idC, { startup: false, extensionId: idC, activationEvent: 'none' });
        }
        catch (err) {
            error = err;
        }
        assert.strictEqual(typeof error === 'undefined', false);
    });
    test('Error: dependency missing', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA, [idB]),
        ]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.errors.length, 1);
        assert.deepStrictEqual(host.errors[0][0], idA);
    });
    test('Error: dependency activation failed', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB]),
            desc(idB)
        ]);
        const activate = activator.activateByEvent('*', false);
        extActivationB.reject(new Error(`b fails!`));
        await activate;
        assert.deepStrictEqual(host.errors.length, 2);
        assert.deepStrictEqual(host.errors[0][0], idB);
        assert.deepStrictEqual(host.errors[1][0], idA);
    });
    test('issue #144518: Problem with git extension and vscode-icons', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const extActivationC = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
            [idC, extActivationC]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB]),
            desc(idB),
            desc(idC),
        ]);
        activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idB, idC]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idC, idA]);
        extActivationA.resolve();
    });
    class SimpleExtensionsActivatorHost {
        constructor() {
            this.activateCalls = [];
            this.errors = [];
        }
        onExtensionActivationError(extensionId, error, missingExtensionDependency) {
            this.errors.push([extensionId, error, missingExtensionDependency]);
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
    }
    class PromiseExtensionsActivatorHost extends SimpleExtensionsActivatorHost {
        constructor(_promises) {
            super();
            this._promises = _promises;
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            for (const [id, promiseSource] of this._promises) {
                if (id.value === extensionId.value) {
                    return promiseSource.promise;
                }
            }
            throw new Error(`Unexpected!`);
        }
    }
    class ExtensionActivationPromiseSource {
        constructor() {
            ({ promise: this.promise, resolve: this._resolve, reject: this._reject } = promiseWithResolvers());
        }
        resolve() {
            this._resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        reject(err) {
            this._reject(err);
        }
    }
    const basicActivationEventsReader = {
        readActivationEvents: (extensionDescription) => {
            return extensionDescription.activationEvents ?? [];
        }
    };
    function createActivator(host, extensionDescriptions, otherHostExtensionDescriptions = []) {
        const registry = new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions);
        const globalRegistry = new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions.concat(otherHostExtensionDescriptions));
        return new ExtensionsActivator(registry, globalRegistry, host, new NullLogService());
    }
    function desc(id, deps = [], activationEvents = ['*']) {
        return {
            name: id.value,
            publisher: 'test',
            version: '0.0.0',
            engines: { vscode: '^1.0.0' },
            identifier: id,
            extensionLocation: URI.parse(`nothing://nowhere`),
            isBuiltin: false,
            isUnderDevelopment: false,
            isUserBuiltin: false,
            activationEvents,
            main: 'index.js',
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            extensionDependencies: deps.map(d => d.value),
            enabledApiProposals: undefined,
            preRelease: false,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUMsTUFBTSxzREFBc0QsQ0FBQztBQUNsSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFzQixjQUFjLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQTRCLE1BQU0sMkNBQTJDLENBQUM7QUFDeEssT0FBTyxFQUFFLDRCQUE0QixFQUEyQixNQUFNLHFFQUFxRSxDQUFDO0FBRzVJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6QyxJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkUsTUFB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
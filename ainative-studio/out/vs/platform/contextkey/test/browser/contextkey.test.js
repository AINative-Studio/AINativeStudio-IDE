/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { ContextKeyService, setContext } from '../../browser/contextKeyService.js';
import { ContextKeyExpr, IContextKeyService } from '../../common/contextkey.js';
import { ServiceCollection } from '../../../instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
suite('ContextKeyService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('updateParent', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const parent1 = testDisposables.add(root.createScoped(document.createElement('div')));
        const parent2 = testDisposables.add(root.createScoped(document.createElement('div')));
        const child = testDisposables.add(parent1.createScoped(document.createElement('div')));
        parent1.createKey('testA', 1);
        parent1.createKey('testB', 2);
        parent1.createKey('testD', 0);
        parent2.createKey('testA', 3);
        parent2.createKey('testC', 4);
        parent2.createKey('testD', 0);
        let complete;
        let reject;
        const p = new Promise((_complete, _reject) => {
            complete = _complete;
            reject = _reject;
        });
        testDisposables.add(child.onDidChangeContext(e => {
            try {
                assert.ok(e.affectsSome(new Set(['testA'])), 'testA changed');
                assert.ok(e.affectsSome(new Set(['testB'])), 'testB changed');
                assert.ok(e.affectsSome(new Set(['testC'])), 'testC changed');
                assert.ok(!e.affectsSome(new Set(['testD'])), 'testD did not change');
                assert.strictEqual(child.getContextKeyValue('testA'), 3);
                assert.strictEqual(child.getContextKeyValue('testB'), undefined);
                assert.strictEqual(child.getContextKeyValue('testC'), 4);
                assert.strictEqual(child.getContextKeyValue('testD'), 0);
            }
            catch (err) {
                reject(err);
                return;
            }
            complete();
        }));
        child.updateParent(parent2);
        return p;
    });
    test('updateParent to same service', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const parent1 = testDisposables.add(root.createScoped(document.createElement('div')));
        const child = testDisposables.add(parent1.createScoped(document.createElement('div')));
        parent1.createKey('testA', 1);
        parent1.createKey('testB', 2);
        parent1.createKey('testD', 0);
        let eventFired = false;
        testDisposables.add(child.onDidChangeContext(e => {
            eventFired = true;
        }));
        child.updateParent(parent1);
        assert.strictEqual(eventFired, false);
    });
    test('issue #147732: URIs as context values', () => {
        const configurationService = new TestConfigurationService();
        const contextKeyService = testDisposables.add(new ContextKeyService(configurationService));
        const instantiationService = testDisposables.add(new TestInstantiationService(new ServiceCollection([IConfigurationService, configurationService], [IContextKeyService, contextKeyService], [ITelemetryService, new class extends mock() {
                async publicLog2() {
                    //
                }
            }])));
        const uri = URI.parse('test://abc');
        contextKeyService.createKey('notebookCellResource', undefined).set(uri.toString());
        instantiationService.invokeFunction(setContext, 'jupyter.runByLineCells', JSON.parse(JSON.stringify([uri])));
        const expr = ContextKeyExpr.in('notebookCellResource', 'jupyter.runByLineCells');
        assert.deepStrictEqual(contextKeyService.contextMatchesRules(expr), true);
    });
    test('suppress update event from parent when one key is overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        child.createKey('testA', 4);
        let fired = false;
        const event = testDisposables.add(child.onDidChangeContext(e => fired = true));
        root.setContext('testA', 10);
        assert.strictEqual(fired, false, 'Should not fire event when overridden key is updated in parent');
        event.dispose();
    });
    test('suppress update event from parent when all keys are overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        root.createKey('testB', 2);
        root.createKey('testC', 3);
        child.createKey('testA', 4);
        child.createKey('testB', 5);
        child.createKey('testD', 6);
        let fired = false;
        const event = testDisposables.add(child.onDidChangeContext(e => fired = true));
        root.bufferChangeEvents(() => {
            root.setContext('testA', 10);
            root.setContext('testB', 20);
            root.setContext('testD', 30);
        });
        assert.strictEqual(fired, false, 'Should not fire event when overridden key is updated in parent');
        event.dispose();
    });
    test('pass through update event from parent when one key is not overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        root.createKey('testB', 2);
        root.createKey('testC', 3);
        child.createKey('testA', 4);
        child.createKey('testB', 5);
        child.createKey('testD', 6);
        const def = new DeferredPromise();
        testDisposables.add(child.onDidChangeContext(e => {
            try {
                assert.ok(e.affectsSome(new Set(['testA'])), 'testA changed');
                assert.ok(e.affectsSome(new Set(['testB'])), 'testB changed');
                assert.ok(e.affectsSome(new Set(['testC'])), 'testC changed');
            }
            catch (err) {
                def.error(err);
                return;
            }
            def.complete(undefined);
        }));
        root.bufferChangeEvents(() => {
            root.setContext('testA', 10);
            root.setContext('testB', 20);
            root.setContext('testC', 30);
        });
        return def.p;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHRrZXkvdGVzdC9icm93c2VyL2NvbnRleHRrZXkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUzRSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sZUFBZSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFbEUsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcs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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { CommandService } from '../../common/commandService.js';
import { NullExtensionService } from '../../../extensions/common/extensions.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
suite('CommandService', function () {
    let commandRegistration;
    setup(function () {
        commandRegistration = CommandsRegistry.registerCommand('foo', function () { });
    });
    teardown(function () {
        commandRegistration.dispose();
    });
    test('activateOnCommand', () => {
        let lastEvent;
        const service = new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(activationEvent) {
                lastEvent = activationEvent;
                return super.activateByEvent(activationEvent);
            }
        }, new NullLogService());
        return service.executeCommand('foo').then(() => {
            assert.ok(lastEvent, 'onCommand:foo');
            return service.executeCommand('unknownCommandId');
        }).then(() => {
            assert.ok(false);
        }, () => {
            assert.ok(lastEvent, 'onCommand:unknownCommandId');
        });
    });
    test('fwd activation error', async function () {
        const extensionService = new class extends NullExtensionService {
            activateByEvent(activationEvent) {
                return Promise.reject(new Error('bad_activate'));
            }
        };
        const service = new CommandService(new InstantiationService(), extensionService, new NullLogService());
        await extensionService.whenInstalledExtensionsRegistered();
        return service.executeCommand('foo').then(() => assert.ok(false), err => {
            assert.strictEqual(err.message, 'bad_activate');
        });
    });
    test('!onReady, but executeCommand', function () {
        let callCounter = 0;
        const reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);
        const service = new CommandService(new InstantiationService(), new class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return new Promise(_resolve => { });
            }
        }, new NullLogService());
        service.executeCommand('bar');
        assert.strictEqual(callCounter, 1);
        reg.dispose();
    });
    test('issue #34913: !onReady, unknown command', function () {
        let callCounter = 0;
        let resolveFunc;
        const whenInstalledExtensionsRegistered = new Promise(_resolve => { resolveFunc = _resolve; });
        const service = new CommandService(new InstantiationService(), new class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return whenInstalledExtensionsRegistered;
            }
        }, new NullLogService());
        const r = service.executeCommand('bar');
        assert.strictEqual(callCounter, 0);
        const reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);
        resolveFunc(true);
        return r.then(() => {
            reg.dispose();
            assert.strictEqual(callCounter, 1);
        });
    });
    test('Stop waiting for * extensions to activate when trigger is satisfied #62457', function () {
        let callCounter = 0;
        const disposable = new DisposableStore();
        const events = [];
        const service = new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(event) {
                events.push(event);
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                callCounter += 1;
                            });
                            disposable.add(reg);
                            resolve();
                        }, 0);
                    });
                }
                return Promise.resolve();
            }
        }, new NullLogService());
        return service.executeCommand('farboo').then(() => {
            assert.strictEqual(callCounter, 1);
            assert.deepStrictEqual(events.sort(), ['*', 'onCommand:farboo'].sort());
        }).finally(() => {
            disposable.dispose();
        });
    });
    test('issue #71471: wait for onCommand activation even if a command is registered', () => {
        const expectedOrder = ['registering command', 'resolving activation event', 'executing command'];
        const actualOrder = [];
        const disposables = new DisposableStore();
        const service = new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(event) {
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            // Register the command after some time
                            actualOrder.push('registering command');
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                actualOrder.push('executing command');
                            });
                            disposables.add(reg);
                            setTimeout(() => {
                                // Resolve the activation event after some more time
                                actualOrder.push('resolving activation event');
                                resolve();
                            }, 10);
                        }, 10);
                    });
                }
                return Promise.resolve();
            }
        }, new NullLogService());
        return service.executeCommand('farboo2').then(() => {
            assert.deepStrictEqual(actualOrder, expectedOrder);
        }).finally(() => {
            disposables.dispose();
        });
    });
    test('issue #142155: execute commands synchronously if possible', async () => {
        const actualOrder = [];
        const disposables = new DisposableStore();
        disposables.add(CommandsRegistry.registerCommand(`bizBaz`, () => {
            actualOrder.push('executing command');
        }));
        const extensionService = new class extends NullExtensionService {
            activationEventIsDone(_activationEvent) {
                return true;
            }
        };
        const service = new CommandService(new InstantiationService(), extensionService, new NullLogService());
        await extensionService.whenInstalledExtensionsRegistered();
        try {
            actualOrder.push(`before call`);
            const promise = service.executeCommand('bizBaz');
            actualOrder.push(`after call`);
            await promise;
            actualOrder.push(`resolved`);
            assert.deepStrictEqual(actualOrder, [
                'before call',
                'executing command',
                'after call',
                'resolved'
            ]);
        }
        finally {
            disposables.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29tbWFuZHMvdGVzdC9jb21tb24vY29tbWFuZFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0lBRXZCLElBQUksbUJBQWdDLENBQUM7SUFFckMsS0FBSyxDQUFDO1FBQ0wsbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDO1FBQ1IsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBRTlCLElBQUksU0FBaUIsQ0FBQztRQUV0QixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLEVBQUUsSUFBSSxLQUFNLFNBQVEsb0JBQW9C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
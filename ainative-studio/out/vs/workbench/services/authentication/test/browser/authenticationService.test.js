/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { AuthenticationService } from '../../browser/authenticationService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
function createSession() {
    return { id: 'session1', accessToken: 'token1', account: { id: 'account', label: 'Account' }, scopes: ['test'] };
}
function createProvider(overrides = {}) {
    return {
        supportsMultipleAccounts: false,
        onDidChangeSessions: new Emitter().event,
        id: 'test',
        label: 'Test',
        getSessions: async () => [],
        createSession: async () => createSession(),
        removeSession: async () => { },
        ...overrides
    };
}
suite('AuthenticationService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let authenticationService;
    setup(() => {
        const storageService = disposables.add(new TestStorageService());
        const authenticationAccessService = disposables.add(new AuthenticationAccessService(storageService, TestProductService));
        authenticationService = disposables.add(new AuthenticationService(new TestExtensionService(), authenticationAccessService, TestEnvironmentService, new NullLogService()));
    });
    teardown(() => {
        // Dispose the authentication service after each test
        authenticationService.dispose();
    });
    suite('declaredAuthenticationProviders', () => {
        test('registerDeclaredAuthenticationProvider', async () => {
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            const provider = {
                id: 'github',
                label: 'GitHub'
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            // Assert that the provider is added to the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 1);
            assert.deepEqual(authenticationService.declaredProviders[0], provider);
            await changed;
        });
        test('unregisterDeclaredAuthenticationProvider', async () => {
            const provider = {
                id: 'github',
                label: 'GitHub'
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            authenticationService.unregisterDeclaredAuthenticationProvider(provider.id);
            // Assert that the provider is removed from the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 0);
            await changed;
        });
    });
    suite('authenticationProviders', () => {
        test('isAuthenticationProviderRegistered', async () => {
            const registered = Event.toPromise(authenticationService.onDidRegisterAuthenticationProvider);
            const provider = createProvider();
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            const result = await registered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('unregisterAuthenticationProvider', async () => {
            const unregistered = Event.toPromise(authenticationService.onDidUnregisterAuthenticationProvider);
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            authenticationService.unregisterAuthenticationProvider(provider.id);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            const result = await unregistered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('getProviderIds', () => {
            const provider1 = createProvider({
                id: 'provider1',
                label: 'Provider 1'
            });
            const provider2 = createProvider({
                id: 'provider2',
                label: 'Provider 2'
            });
            authenticationService.registerAuthenticationProvider(provider1.id, provider1);
            authenticationService.registerAuthenticationProvider(provider2.id, provider2);
            const providerIds = authenticationService.getProviderIds();
            // Assert that the providerIds array contains the registered provider ids
            assert.deepEqual(providerIds, [provider1.id, provider2.id]);
        });
        test('getProvider', () => {
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const retrievedProvider = authenticationService.getProvider(provider.id);
            // Assert that the retrieved provider is the same as the registered provider
            assert.deepEqual(retrievedProvider, provider);
        });
    });
    suite('authenticationSessions', () => {
        test('getSessions', async () => {
            let isCalled = false;
            const provider = createProvider({
                getSessions: async () => {
                    isCalled = true;
                    return [createSession()];
                },
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const sessions = await authenticationService.getSessions(provider.id);
            assert.equal(sessions.length, 1);
            assert.ok(isCalled);
        });
        test('createSession', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                createSession: async () => {
                    const session = createSession();
                    emitter.fire({ added: [session], removed: [], changed: [] });
                    return session;
                },
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const session = await authenticationService.createSession(provider.id, ['repo']);
            // Assert that the created session matches the expected session and the event fires
            assert.ok(session);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [session], removed: [], changed: [] }
            });
        });
        test('removeSession', async () => {
            const emitter = new Emitter();
            const session = createSession();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                removeSession: async () => emitter.fire({ added: [], removed: [session], changed: [] })
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            await authenticationService.removeSession(provider.id, session.id);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [session], changed: [] }
            });
        });
        test('onDidChangeSessions', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                getSessions: async () => []
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            const session = createSession();
            emitter.fire({ added: [], removed: [], changed: [session] });
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [], changed: [session] }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL3Rlc3QvYnJvd3Nlci9hdXRoZW50aWNhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsU0FBUyxhQUFhO0lBQ3JCLE9BQU8sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNsSCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsWUFBOEMsRUFBRTtJQUN2RSxPQUFPO1FBQ04sd0JBQXdCLEVBQUUsS0FBSztRQUMvQixtQkFBbUIsRUFBRSxJ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
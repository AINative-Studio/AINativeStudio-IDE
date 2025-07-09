/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, LogLevel, NullLogger } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpServerConnection } from '../../common/mcpServerConnection.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
class TestMcpHostDelegate extends Disposable {
    constructor() {
        super();
        this._canStartValue = true;
        this.priority = 0;
        this._transport = this._register(new TestMcpMessageTransport());
    }
    canStart() {
        return this._canStartValue;
    }
    start() {
        if (!this._canStartValue) {
            throw new Error('Cannot start server');
        }
        return this._transport;
    }
    getTransport() {
        return this._transport;
    }
    setCanStart(value) {
        this._canStartValue = value;
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
suite('Workbench - MCP - ServerConnection', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let delegate;
    let transport;
    let collection;
    let serverDefinition;
    setup(() => {
        delegate = store.add(new TestMcpHostDelegate());
        transport = delegate.getTransport();
        // Setup test services
        const services = new ServiceCollection([ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IStorageService, store.add(new TestStorageService())], [IProductService, TestProductService]);
        instantiationService = store.add(new TestInstantiationService(services));
        // Create test collection
        collection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            isTrustedByDefault: true,
            scope: -1 /* StorageScope.APPLICATION */
        };
        // Create server definition
        serverDefinition = {
            id: 'test-server',
            label: 'Test Server',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: URI.parse('file:///test')
            }
        };
    });
    function waitForHandler(cnx) {
        const handler = cnx.handler.get();
        if (handler) {
            return Promise.resolve(handler);
        }
        return new Promise(resolve => {
            const disposable = autorun(reader => {
                const handler = cnx.handler.read(reader);
                if (handler) {
                    disposable.dispose();
                    resolve(handler);
                }
            });
        });
    }
    test('should start and set state to Running when transport succeeds', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state = await startPromise;
        assert.strictEqual(state.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
    });
    test('should handle errors during start', async () => {
        // Setup delegate to fail on start
        delegate.setCanStart(false);
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const state = await connection.start();
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.ok(state.message);
    });
    test('should handle transport errors', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate error in transport
        transport.setConnectionState({
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Test error message'
        });
        const state = await startPromise;
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.strictEqual(state.message, 'Test error message');
    });
    test('should stop and set state to Stopped', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Stop the connection
        const stopPromise = connection.stop();
        await stopPromise;
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should not restart if already starting', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise1 = connection.start();
        // Try to start again while starting
        const startPromise2 = connection.start();
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state1 = await startPromise1;
        const state2 = await startPromise2;
        // Both promises should resolve to the same state
        assert.strictEqual(state1.state, 2 /* McpConnectionState.Kind.Running */);
        assert.strictEqual(state2.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
        connection.dispose();
    });
    test('should clean up when disposed', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        // Start the connection
        const startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Dispose the connection
        connection.dispose();
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should log transport messages', async () => {
        // Track logged messages
        const loggedMessages = [];
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, {
            getLevel: () => LogLevel.Debug,
            info: (message) => {
                loggedMessages.push(message);
            },
            error: () => { },
            dispose: () => { }
        });
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate log message from transport
        transport.simulateLog('Test log message');
        // Set connection to running
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Check that the message was logged
        assert.ok(loggedMessages.some(msg => msg === 'Test log message'));
        connection.dispose();
        await timeout(10);
    });
    test('should correctly handle transitions to and from error state', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Transition to error state
        const errorState = {
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Temporary error'
        };
        transport.setConnectionState(errorState);
        let state = await startPromise;
        assert.equal(state, errorState);
        transport.setConnectionState({ state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Transition back to running state
        const startPromise2 = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        state = await startPromise2;
        assert.deepStrictEqual(state, { state: 2 /* McpConnectionState.Kind.Running */ });
        connection.dispose();
        await timeout(10);
    });
    test('should handle multiple start/stop cycles', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // First cycle
        let startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Second cycle
        startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        assert.deepStrictEqual(connection.state.get(), { state: 2 /* McpConnectionState.Kind.Running */ });
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        connection.dispose();
        await timeout(10);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BTZXJ2ZXJDb25uZWN0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFXLGNBQWMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTdILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWhFLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU0zQztRQUNDLEtBQUssRUFBRSxDQUFDO1FBTEQsbUJBQWMsR0FBRyxJQUFJLENBQUM7UUFFOUIsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUlaLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELFdBQVcsQ0FBQyxLQUFjO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzdCLENBQUM7SUFFRCw4QkFBOEI7UUFDN0IsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxRQUE2QixDQUFDO0lBQ2xDLElBQUksU0FBa0MsQ0FBQztJQUN2QyxJQUFJLFVBQW1DLENBQUM7SUFDeEMsSUFBSSxnQkFBcUMsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFDaEQsU0FBUyxHQUFHLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQyxzQkFBc0I7UUFDdEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FDckMsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUNwRCxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNwRCxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQ3RELENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQ3JDLENBQUM7UUFFRixvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV6RSx5QkFBeUI7UUFDekIsVUFBVSxHQUFHO1lBQ1osRUFBRSxFQUFFLGlCQUFpQjtZQUNyQixLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ3BELGtCQUFrQixFQUFFLElBQUk7WUFDeEIsS0FBSyxtQ0FBMEI7U0FDL0IsQ0FBQztRQUVGLDJCQUEyQjtRQUMzQixnQkFBZ0IsR0FBRztZQUNsQixFQUFFLEVBQUUsYUFBYTtZQUNqQixLQUFLLEVBQUUsYUFBYTtZQUNwQixNQUFNLEVBQUU7Z0JBQ1AsSUFBSSxzQ0FBOEI7Z0JBQ2xDLE9BQU8sRUFBRSxjQUFjO2dCQUN2QixJQUFJLEVBQUUsRUFBRTtnQkFDUixHQUFHLEVBQUUsRUFBRTtnQkFDUCxPQUFPLEVBQUUsU0FBUztnQkFDbEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO2FBQzlCO1NBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxjQUFjLENBQUMsR0FBd0I7UUFDL0MsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQzVCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2xCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksQ0FBQywrREFBK0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRiwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0Qix1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXhDLGlDQUFpQztRQUNqQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUV6RSxNQUFNLEtBQUssR0FBRyxNQUFNLFlBQVksQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLDBDQUFrQyxDQUFDO1FBRWpFLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRCxrQ0FBa0M7UUFDbEMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU1QiwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0Qix1QkFBdUI7UUFDdkIsTUFBTSxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyx3Q0FBZ0MsQ0FBQztRQUMvRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRCwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0Qix1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXhDLDhCQUE4QjtRQUM5QixTQUFTLENBQUMsa0JBQWtCLENBQUM7WUFDNUIsS0FBSyx1Q0FBK0I7WUFDcEMsT0FBTyxFQUFFLG9CQUFvQjtTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBRyxNQUFNLFlBQVksQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLHdDQUFnQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZELDJCQUEyQjtRQUMzQixNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3JELG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLFFBQVEsRUFDUixnQkFBZ0IsQ0FBQyxNQUFNLEVBQ3ZCLElBQUksVUFBVSxFQUFFLENBQ2hCLENBQUM7UUFDRixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRCLHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDeEMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyx5Q0FBaUMsRUFBRSxDQUFDLENBQUM7UUFDekUsTUFBTSxZQUFZLENBQUM7UUFFbkIsc0JBQXNCO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFdBQVcsQ0FBQztRQUVsQixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSywwQ0FBa0MsQ0FBQztJQUNuRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0Qix1QkFBdUI7UUFDdkIsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXpDLG9DQUFvQztRQUNwQyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekMsaUNBQWlDO1FBQ2pDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxDQUFDO1FBRW5DLGlEQUFpRDtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLDBDQUFrQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssMENBQWtDLENBQUM7UUFFbEUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRTVDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRCwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBRUYsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN4QyxTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUN6RSxNQUFNLFlBQVksQ0FBQztRQUVuQix5QkFBeUI7UUFDekIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLDBDQUFrQyxDQUFDO0lBQ25GLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELHdCQUF3QjtRQUN4QixNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMsMkJBQTJCO1FBQzNCLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDckQsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsUUFBUSxFQUNSLGdCQUFnQixDQUFDLE1BQU0sRUFDdkI7WUFDQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUs7WUFDOUIsSUFBSSxFQUFFLENBQUMsT0FBZSxFQUFFLEVBQUU7Z0JBQ3pCLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1NBQ2EsQ0FDaEMsQ0FBQztRQUNGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdEIsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV4QyxzQ0FBc0M7UUFDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRTFDLDRCQUE0QjtRQUM1QixTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUN6RSxNQUFNLFlBQVksQ0FBQztRQUVuQixvQ0FBb0M7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUVsRSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckIsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkRBQTZELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUUsMkJBQTJCO1FBQzNCLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDckQsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsUUFBUSxFQUNSLGdCQUFnQixDQUFDLE1BQU0sRUFDdkIsSUFBSSxVQUFVLEVBQUUsQ0FDaEIsQ0FBQztRQUNGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdEIsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV4Qyw0QkFBNEI7UUFDNUIsTUFBTSxVQUFVLEdBQXVCO1lBQ3RDLEtBQUssdUNBQStCO1lBQ3BDLE9BQU8sRUFBRSxpQkFBaUI7U0FDMUIsQ0FBQztRQUNGLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV6QyxJQUFJLEtBQUssR0FBRyxNQUFNLFlBQVksQ0FBQztRQUMvQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUdoQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUV6RSxtQ0FBbUM7UUFDbkMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLEtBQUssR0FBRyxNQUFNLGFBQWEsQ0FBQztRQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRCwyQkFBMkI7UUFDM0IsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRCxtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsZ0JBQWdCLENBQUMsTUFBTSxFQUN2QixJQUFJLFVBQVUsRUFBRSxDQUNoQixDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0QixjQUFjO1FBQ2QsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sWUFBWSxDQUFDO1FBRW5CLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRTNGLGVBQWU7UUFDZixZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sWUFBWSxDQUFDO1FBRW5CLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRTNGLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXhCLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBRTNGLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../common/event.js';
import { Client } from '../../node/ipc.cp.js';
import { TestServiceClient } from './testService.js';
import { FileAccess } from '../../../../common/network.js';
function createClient() {
    return new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, {
        serverName: 'TestServer',
        env: { VSCODE_ESM_ENTRYPOINT: 'vs/base/parts/ipc/test/node/testApp', verbose: true }
    });
}
suite('IPC, Child Process', function () {
    this.slow(2000);
    this.timeout(10000);
    let client;
    let channel;
    let service;
    setup(() => {
        client = createClient();
        channel = client.getChannel('test');
        service = new TestServiceClient(channel);
    });
    teardown(() => {
        client.dispose();
    });
    test('createChannel', async () => {
        const result = await service.pong('ping');
        assert.strictEqual(result.incoming, 'ping');
        assert.strictEqual(result.outgoing, 'pong');
    });
    test('events', async () => {
        const event = Event.toPromise(Event.once(service.onMarco));
        const promise = service.marco();
        const [promiseResult, eventResult] = await Promise.all([promise, event]);
        assert.strictEqual(promiseResult, 'polo');
        assert.strictEqual(eventResult.answer, 'polo');
    });
    test('event dispose', async () => {
        let count = 0;
        const disposable = service.onMarco(() => count++);
        const answer = await service.marco();
        assert.strictEqual(answer, 'polo');
        assert.strictEqual(count, 1);
        const answer_1 = await service.marco();
        assert.strictEqual(answer_1, 'polo');
        assert.strictEqual(count, 2);
        disposable.dispose();
        const answer_2 = await service.marco();
        assert.strictEqual(answer_2, 'polo');
        assert.strictEqual(count, 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmNwLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L25vZGUvaXBjLmNwLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXBELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUM5QyxPQUFPLEVBQWdCLGlCQUFpQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTNELFNBQVMsWUFBWTtJQUNwQixPQUFPLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDaEUsVUFBVSxFQUFFLFlBQVk7UUFDeEIsR0FBRyxFQUFFLEVBQUUscUJBQXFCLEVBQUUscUNBQXFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtLQUNwRixDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsS0FBSyxDQUFDLG9CQUFvQixFQUFFO0lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVwQixJQUFJLE1BQWMsQ0FBQztJQUNuQixJQUFJLE9BQWlCLENBQUM7SUFDdEIsSUFBSSxPQUFxQixDQUFDO0lBRTFCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFDeEIsT0FBTyxHQUFHLE1BQU0sQ0FBQyxVQUFV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
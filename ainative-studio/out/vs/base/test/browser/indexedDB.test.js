/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexedDB } from '../../browser/indexedDB.js';
import { flakySuite } from '../common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
flakySuite('IndexedDB', () => {
    let indexedDB;
    setup(async () => {
        indexedDB = await IndexedDB.create('vscode-indexeddb-test', 1, ['test-store']);
        await indexedDB.runInTransaction('test-store', 'readwrite', store => store.clear());
    });
    teardown(() => {
        indexedDB?.close();
    });
    test('runInTransaction', async () => {
        await indexedDB.runInTransaction('test-store', 'readwrite', store => store.add('hello1', 'key1'));
        const value = await indexedDB.runInTransaction('test-store', 'readonly', store => store.get('key1'));
        assert.deepStrictEqual(value, 'hello1');
    });
    test('getKeyValues', async () => {
        await indexedDB.runInTransaction('test-store', 'readwrite', store => {
            const requests = [];
            requests.push(store.add('hello1', 'key1'));
            requests.push(store.add('hello2', 'key2'));
            requests.push(store.add(true, 'key3'));
            return requests;
        });
        function isValid(value) {
            return typeof value === 'string';
        }
        const keyValues = await indexedDB.getKeyValues('test-store', isValid);
        assert.strictEqual(keyValues.size, 2);
        assert.strictEqual(keyValues.get('key1'), 'hello1');
        assert.strictEqual(keyValues.get('key2'), 'hello2');
    });
    test('hasPendingTransactions', async () => {
        const promise = indexedDB.runInTransaction('test-store', 'readwrite', store => store.add('hello2', 'key2'));
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), true);
        await promise;
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), false);
    });
    test('close', async () => {
        const promise = indexedDB.runInTransaction('test-store', 'readwrite', store => store.add('hello3', 'key3'));
        indexedDB.close();
        assert.deepStrictEqual(indexedDB.hasPendingTransactions(), false);
        try {
            await promise;
            assert.fail('Transaction should be aborted');
        }
        catch (error) { }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvaW5kZXhlZERCLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsVUFBVSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFFNUIsSUFBSSxTQUFvQixDQUFDO0lBRXpCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixTQUFTLEdBQUcsTUFBTSxTQUFTLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDL0UsTUFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3JGLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxD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
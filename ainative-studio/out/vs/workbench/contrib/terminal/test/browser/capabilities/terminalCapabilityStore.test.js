/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCapabilityStore, TerminalCapabilityStoreMultiplexer } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
suite('TerminalCapabilityStore', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let capabilityStore;
    let addEvents;
    let removeEvents;
    setup(() => {
        capabilityStore = store.add(new TerminalCapabilityStore());
        store.add(capabilityStore.onDidAddCapabilityType(e => addEvents.push(e)));
        store.add(capabilityStore.onDidRemoveCapabilityType(e => removeEvents.push(e)));
        addEvents = [];
        removeEvents = [];
    });
    teardown(() => capabilityStore.dispose());
    test('should fire events when capabilities are added', () => {
        assertEvents(addEvents, []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */]);
    });
    test('should fire events when capabilities are removed', async () => {
        assertEvents(removeEvents, []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(removeEvents, []);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        assertEvents(removeEvents, [0 /* TerminalCapability.CwdDetection */]);
    });
    test('has should return whether a capability is present', () => {
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), false);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), true);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), false);
    });
    test('items should reflect current state', () => {
        deepStrictEqual(Array.from(capabilityStore.items), []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(Array.from(capabilityStore.items), [0 /* TerminalCapability.CwdDetection */]);
        capabilityStore.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        deepStrictEqual(Array.from(capabilityStore.items), [0 /* TerminalCapability.CwdDetection */, 1 /* TerminalCapability.NaiveCwdDetection */]);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(Array.from(capabilityStore.items), [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
});
suite('TerminalCapabilityStoreMultiplexer', () => {
    let store;
    let multiplexer;
    let store1;
    let store2;
    let addEvents;
    let removeEvents;
    setup(() => {
        store = new DisposableStore();
        multiplexer = store.add(new TerminalCapabilityStoreMultiplexer());
        multiplexer.onDidAddCapabilityType(e => addEvents.push(e));
        multiplexer.onDidRemoveCapabilityType(e => removeEvents.push(e));
        store1 = store.add(new TerminalCapabilityStore());
        store2 = store.add(new TerminalCapabilityStore());
        addEvents = [];
        removeEvents = [];
    });
    teardown(() => store.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should fire events when capabilities are enabled', async () => {
        assertEvents(addEvents, []);
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */]);
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        assertEvents(addEvents, [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('should fire events when capabilities are disabled', async () => {
        assertEvents(removeEvents, []);
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        assertEvents(removeEvents, []);
        store1.remove(0 /* TerminalCapability.CwdDetection */);
        assertEvents(removeEvents, [0 /* TerminalCapability.CwdDetection */]);
        store2.remove(1 /* TerminalCapability.NaiveCwdDetection */);
        assertEvents(removeEvents, [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('should fire events when stores are added', async () => {
        assertEvents(addEvents, []);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, []);
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        multiplexer.add(store1);
        multiplexer.add(store2);
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */, 1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('items should return items from all stores', () => {
        deepStrictEqual(Array.from(multiplexer.items).sort(), [].sort());
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(Array.from(multiplexer.items).sort(), [0 /* TerminalCapability.CwdDetection */].sort());
        store1.add(2 /* TerminalCapability.CommandDetection */, {});
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        deepStrictEqual(Array.from(multiplexer.items).sort(), [0 /* TerminalCapability.CwdDetection */, 2 /* TerminalCapability.CommandDetection */, 1 /* TerminalCapability.NaiveCwdDetection */].sort());
        store2.remove(1 /* TerminalCapability.NaiveCwdDetection */);
        deepStrictEqual(Array.from(multiplexer.items).sort(), [0 /* TerminalCapability.CwdDetection */, 2 /* TerminalCapability.CommandDetection */].sort());
    });
    test('has should return whether a capability is present', () => {
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), false);
        multiplexer.add(store1);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), true);
        store1.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), false);
    });
});
function assertEvents(actual, expected) {
    deepStrictEqual(actual, expected);
    actual.length = 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDYXBhYmlsaXR5U3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvY2FwYWJpbGl0aWVzL3Rlcm1pbmFsQ2FwYWJpbGl0eVN0b3JlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFFakssS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksZUFBd0MsQ0FBQztJQUM3QyxJQUFJLFNBQStCLENBQUM7SUFDcEMsSUFBSSxZQUFrQyxDQUFDO0lBRXZDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUMzRCxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMs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
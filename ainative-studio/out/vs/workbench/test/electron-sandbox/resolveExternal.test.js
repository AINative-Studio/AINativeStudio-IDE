/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { NativeWindow } from '../../electron-sandbox/window.js';
import { ITunnelService } from '../../../platform/tunnel/common/tunnel.js';
import { URI } from '../../../base/common/uri.js';
import { workbenchInstantiationService } from './workbenchTestServices.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
class TunnelMock {
    constructor() {
        this.assignedPorts = {};
        this.expectedDispose = false;
    }
    reset(ports) {
        this.assignedPorts = ports;
    }
    expectDispose() {
        this.expectedDispose = true;
    }
    getExistingTunnel() {
        return Promise.resolve(undefined);
    }
    openTunnel(_addressProvider, _host, port) {
        if (!this.assignedPorts[port]) {
            return Promise.reject(new Error('Unexpected tunnel request'));
        }
        const res = {
            localAddress: `localhost:${this.assignedPorts[port]}`,
            tunnelRemoteHost: '4.3.2.1',
            tunnelRemotePort: this.assignedPorts[port],
            privacy: '',
            dispose: () => {
                assert(this.expectedDispose, 'Unexpected dispose');
                this.expectedDispose = false;
                return Promise.resolve();
            }
        };
        delete this.assignedPorts[port];
        return Promise.resolve(res);
    }
    validate() {
        try {
            assert(Object.keys(this.assignedPorts).length === 0, 'Expected tunnel to be used');
            assert(!this.expectedDispose, 'Expected dispose to be called');
        }
        finally {
            this.expectedDispose = false;
        }
    }
}
class TestNativeWindow extends NativeWindow {
    create() { }
    registerListeners() { }
    enableMultiWindowAwareTimeout() { }
}
suite.skip('NativeWindow:resolveExternal', () => {
    const disposables = new DisposableStore();
    const tunnelMock = new TunnelMock();
    let window;
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(ITunnelService, tunnelMock);
        window = disposables.add(instantiationService.createInstance(TestNativeWindow));
    });
    teardown(() => {
        disposables.clear();
    });
    async function doTest(uri, ports = {}, expectedUri) {
        tunnelMock.reset(ports);
        const res = await window.resolveExternalUri(URI.parse(uri), {
            allowTunneling: true,
            openExternal: true
        });
        assert.strictEqual(!expectedUri, !res, `Expected URI ${expectedUri} but got ${res}`);
        if (expectedUri && res) {
            assert.strictEqual(res.resolved.toString(), URI.parse(expectedUri).toString());
        }
        tunnelMock.validate();
    }
    test('invalid', async () => {
        await doTest('file:///foo.bar/baz');
        await doTest('http://foo.bar/path');
    });
    test('simple', async () => {
        await doTest('http://localhost:1234/path', { 1234: 1234 }, 'http://localhost:1234/path');
    });
    test('all interfaces', async () => {
        await doTest('http://0.0.0.0:1234/path', { 1234: 1234 }, 'http://localhost:1234/path');
    });
    test('changed port', async () => {
        await doTest('http://localhost:1234/path', { 1234: 1235 }, 'http://localhost:1235/path');
    });
    test('query', async () => {
        await doTest('http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 4455: 4455 }, 'http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    test('query with different port', async () => {
        tunnelMock.expectDispose();
        await doTest('http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 4455: 4567 });
    });
    test('both url and query', async () => {
        await doTest('http://localhost:1234/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 1234: 4321, 4455: 4455 }, 'http://localhost:4321/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    test('both url and query, query rejected', async () => {
        tunnelMock.expectDispose();
        await doTest('http://localhost:1234/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 1234: 4321, 4455: 5544 }, 'http://localhost:4321/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZUV4dGVybmFsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9yZXNvbHZlRXh0ZXJuYWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQWdCLE1BQU0sMkNBQTJDLENBQUM7QUFDekYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBR2xELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUlwRSxNQUFNLFVBQVU7SUFBaEI7UUFDUyxrQkFBYSxHQUFZLEVBQUUsQ0FBQztRQUM1QixvQkFBZSxHQUFHLEtBQUssQ0FBQztJQXlDakMsQ0FBQztJQXZDQSxLQUFLLENBQUMsS0FBYztRQUNuQixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBRUQsYUFBYTtRQUNaLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxVQUFVLENBQUMsZ0JBQThDLEVBQUUsS0FBeUIsRUFBRSxJQUFZO1FBQ2pHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxF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
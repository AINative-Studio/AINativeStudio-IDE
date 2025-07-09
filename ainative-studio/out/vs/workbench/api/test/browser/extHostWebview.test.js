/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { ExtHostWebviews } from '../../common/extHostWebview.js';
import { ExtHostWebviewPanels } from '../../common/extHostWebviewPanels.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { decodeAuthority, webviewResourceBaseHost } from '../../../contrib/webview/common/webview.js';
suite('ExtHostWebview', () => {
    let disposables;
    let rpcProtocol;
    setup(() => {
        disposables = new DisposableStore();
        const shape = createNoopMainThreadWebviews();
        rpcProtocol = SingleProxyRPCProtocol(shape);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createWebview(rpcProtocol, remoteAuthority) {
        const extHostWebviews = disposables.add(new ExtHostWebviews(rpcProtocol, {
            authority: remoteAuthority,
            isRemote: !!remoteAuthority,
        }, undefined, new NullLogService(), NullApiDeprecationService));
        const extHostWebviewPanels = disposables.add(new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, undefined));
        return disposables.add(extHostWebviewPanels.createWebviewPanel({
            extensionLocation: URI.from({
                scheme: remoteAuthority ? Schemas.vscodeRemote : Schemas.file,
                authority: remoteAuthority,
                path: '/ext/path',
            })
        }, 'type', 'title', 1, {}));
    }
    test('Cannot register multiple serializers for the same view type', async () => {
        const viewType = 'view.type';
        const extHostWebviews = disposables.add(new ExtHostWebviews(rpcProtocol, { authority: undefined, isRemote: false }, undefined, new NullLogService(), NullApiDeprecationService));
        const extHostWebviewPanels = disposables.add(new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, undefined));
        let lastInvokedDeserializer = undefined;
        class NoopSerializer {
            async deserializeWebviewPanel(webview, _state) {
                lastInvokedDeserializer = this;
                disposables.add(webview);
            }
        }
        const extension = {};
        const serializerA = new NoopSerializer();
        const serializerB = new NoopSerializer();
        const serializerARegistration = extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerA);
        await extHostWebviewPanels.$deserializeWebviewPanel('x', viewType, {
            title: 'title',
            state: {},
            panelOptions: {},
            webviewOptions: {},
            active: true,
        }, 0);
        assert.strictEqual(lastInvokedDeserializer, serializerA);
        assert.throws(() => disposables.add(extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerB)), 'Should throw when registering two serializers for the same view');
        serializerARegistration.dispose();
        disposables.add(extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerB));
        await extHostWebviewPanels.$deserializeWebviewPanel('x', viewType, {
            title: 'title',
            state: {},
            panelOptions: {},
            webviewOptions: {},
            active: true,
        }, 0);
        assert.strictEqual(lastInvokedDeserializer, serializerB);
    });
    test('asWebviewUri for local file paths', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ undefined);
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html')).toString()), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix basic');
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html#frag')).toString()), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html#frag`, 'Unix should preserve fragment');
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file:///Users/codey/f%20ile.html')).toString()), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/f%20ile.html`, 'Unix with encoding');
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file://localhost/Users/codey/file.html')).toString()), `https://file%2Blocalhost.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix should preserve authority');
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file:///c:/codey/file.txt')).toString()), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/c%3A/codey/file.txt`, 'Windows C drive');
    });
    test('asWebviewUri for remote file paths', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        assert.strictEqual((webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html')).toString()), `https://vscode-remote%2Bremote.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix basic');
    });
    test('asWebviewUri for remote with / and + in name', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        const authority = 'ssh-remote+localhost=foo/bar';
        const sourceUri = URI.from({
            scheme: 'vscode-remote',
            authority: authority,
            path: '/Users/cody/x.png'
        });
        const webviewUri = webview.webview.asWebviewUri(sourceUri);
        assert.strictEqual(webviewUri.toString(), `https://vscode-remote%2Bssh-002dremote-002blocalhost-003dfoo-002fbar.vscode-resource.vscode-cdn.net/Users/cody/x.png`, 'Check transform');
        assert.strictEqual(decodeAuthority(webviewUri.authority), `vscode-remote+${authority}.vscode-resource.vscode-cdn.net`, 'Check decoded authority');
    });
    test('asWebviewUri for remote with port in name', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        const authority = 'localhost:8080';
        const sourceUri = URI.from({
            scheme: 'vscode-remote',
            authority: authority,
            path: '/Users/cody/x.png'
        });
        const webviewUri = webview.webview.asWebviewUri(sourceUri);
        assert.strictEqual(webviewUri.toString(), `https://vscode-remote%2Blocalhost-003a8080.vscode-resource.vscode-cdn.net/Users/cody/x.png`, 'Check transform');
        assert.strictEqual(decodeAuthority(webviewUri.authority), `vscode-remote+${authority}.vscode-resource.vscode-cdn.net`, 'Check decoded authority');
    });
});
function createNoopMainThreadWebviews() {
    return new class extends mock() {
        $disposeWebview() { }
        $createWebviewPanel() { }
        $registerSerializer() { }
        $unregisterSerializer() { }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0V2Vidmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFLdEcsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxXQUErRCxDQUFDO0lBRXBFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVw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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { flakySuite } from '../../../../base/test/common/testUtils.js';
function testErrorMessage(module) {
    return `Unable to load "${module}" dependency. It was probably not compiled for the right operating system architecture or had missing build tools.`;
}
flakySuite('Native Modules (all platforms)', () => {
    (isMacintosh ? test.skip : test)('kerberos', async () => {
        const { default: kerberos } = await import('kerberos');
        assert.ok(typeof kerberos.initializeClient === 'function', testErrorMessage('kerberos'));
    });
    test('yauzl', async () => {
        const { default: yauzl } = await import('yauzl');
        assert.ok(typeof yauzl.ZipFile === 'function', testErrorMessage('yauzl'));
    });
    test('yazl', async () => {
        const { default: yazl } = await import('yazl');
        assert.ok(typeof yazl.ZipFile === 'function', testErrorMessage('yazl'));
    });
    test('v8-inspect-profiler', async () => {
        const { default: profiler } = await import('v8-inspect-profiler');
        assert.ok(typeof profiler.startProfiling === 'function', testErrorMessage('v8-inspect-profiler'));
    });
    test('native-is-elevated', async () => {
        const { default: isElevated } = await import('native-is-elevated');
        assert.ok(typeof isElevated === 'function', testErrorMessage('native-is-elevated '));
        const result = isElevated();
        assert.ok(typeof result === 'boolean', testErrorMessage('native-is-elevated'));
    });
    test('native-keymap', async () => {
        const keyMap = await import('native-keymap');
        assert.ok(typeof keyMap.onDidChangeKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        assert.ok(typeof keyMap.getCurrentKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        const result = keyMap.getCurrentKeyboardLayout();
        assert.ok(result, testErrorMessage('native-keymap'));
    });
    test('native-watchdog', async () => {
        const watchDog = await import('native-watchdog');
        assert.ok(typeof watchDog.start === 'function', testErrorMessage('native-watchdog'));
    });
    test('@vscode/sudo-prompt', async () => {
        const prompt = await import('@vscode/sudo-prompt');
        assert.ok(typeof prompt.exec === 'function', testErrorMessage('@vscode/sudo-prompt'));
    });
    test('@vscode/policy-watcher', async () => {
        const watcher = await import('@vscode/policy-watcher');
        assert.ok(typeof watcher.createWatcher === 'function', testErrorMessage('@vscode/policy-watcher'));
    });
    test('node-pty', async () => {
        const nodePty = await import('node-pty');
        assert.ok(typeof nodePty.spawn === 'function', testErrorMessage('node-pty'));
    });
    test('open', async () => {
        const { default: open } = await import('open');
        assert.ok(typeof open === 'function', testErrorMessage('open'));
    });
    test('@vscode/spdlog', async () => {
        const spdlog = await import('@vscode/spdlog');
        assert.ok(typeof spdlog.createRotatingLogger === 'function', testErrorMessage('@vscode/spdlog'));
        assert.ok(typeof spdlog.version === 'number', testErrorMessage('@vscode/spdlog'));
    });
    test('@parcel/watcher', async () => {
        const parcelWatcher = await import('@parcel/watcher');
        assert.ok(typeof parcelWatcher.subscribe === 'function', testErrorMessage('@parcel/watcher'));
    });
    test('@vscode/deviceid', async () => {
        const deviceIdPackage = await import('@vscode/deviceid');
        assert.ok(typeof deviceIdPackage.getDeviceId === 'function', testErrorMessage('@vscode/deviceid'));
    });
    test('@vscode/ripgrep', async () => {
        const ripgrep = await import('@vscode/ripgrep');
        assert.ok(typeof ripgrep.rgPath === 'string', testErrorMessage('@vscode/ripgrep'));
    });
    test('vscode-regexpp', async () => {
        const regexpp = await import('vscode-regexpp');
        assert.ok(typeof regexpp.RegExpParser === 'function', testErrorMessage('vscode-regexpp'));
    });
    test('@vscode/sqlite3', async () => {
        const { default: sqlite3 } = await import('@vscode/sqlite3');
        assert.ok(typeof sqlite3.Database === 'function', testErrorMessage('@vscode/sqlite3'));
    });
    test('http-proxy-agent', async () => {
        const { default: mod } = await import('http-proxy-agent');
        assert.ok(typeof mod.HttpProxyAgent === 'function', testErrorMessage('http-proxy-agent'));
    });
    test('https-proxy-agent', async () => {
        const { default: mod } = await import('https-proxy-agent');
        assert.ok(typeof mod.HttpsProxyAgent === 'function', testErrorMessage('https-proxy-agent'));
    });
    test('@vscode/proxy-agent', async () => {
        const proxyAgent = await import('@vscode/proxy-agent');
        // This call will load `@vscode/proxy-agent` which is a native module that we want to test on Windows
        const windowsCerts = await proxyAgent.loadSystemCertificates({
            log: {
                trace: () => { },
                debug: () => { },
                info: () => { },
                warn: () => { },
                error: () => { }
            }
        });
        assert.ok(windowsCerts.length > 0, testErrorMessage('@vscode/proxy-agent'));
    });
});
(!isWindows ? suite.skip : suite)('Native Modules (Windows)', () => {
    test('@vscode/windows-mutex', async () => {
        const mutex = await import('@vscode/windows-mutex');
        assert.ok(mutex && typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.Mutex === 'function', testErrorMessage('@vscode/windows-mutex'));
    });
    test('windows-foreground-love', async () => {
        const foregroundLove = await import('windows-foreground-love');
        assert.ok(typeof foregroundLove.allowSetForegroundWindow === 'function', testErrorMessage('windows-foreground-love'));
        const result = foregroundLove.allowSetForegroundWindow(process.pid);
        assert.ok(typeof result === 'boolean', testErrorMessage('windows-foreground-love'));
    });
    test('@vscode/windows-process-tree', async () => {
        const processTree = await import('@vscode/windows-process-tree');
        assert.ok(typeof processTree.getProcessTree === 'function', testErrorMessage('@vscode/windows-process-tree'));
        return new Promise((resolve, reject) => {
            processTree.getProcessTree(process.pid, tree => {
                if (tree) {
                    resolve();
                }
                else {
                    reject(new Error(testErrorMessage('@vscode/windows-process-tree')));
                }
            });
        });
    });
    test('@vscode/windows-registry', async () => {
        const windowsRegistry = await import('@vscode/windows-registry');
        assert.ok(typeof windowsRegistry.GetStringRegKey === 'function', testErrorMessage('@vscode/windows-registry'));
        const result = windowsRegistry.GetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
        assert.ok(typeof result === 'string' || typeof result === 'undefined', testErrorMessage('@vscode/windows-registry'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTW9kdWxlcy5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvdGVzdC9ub2RlL25hdGl2ZU1vZHVsZXMuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV2RSxTQUFTLGdCQUFnQixDQUFDLE1BQWM7SUFDdkMsT0FBTyxtQkFBbUIsTUFBTSxvSEFBb0gsQ0FBQztBQUN0SixDQUFDO0FBRUQsVUFBVSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUVqRCxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZELE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsS0FBSyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEIsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFN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
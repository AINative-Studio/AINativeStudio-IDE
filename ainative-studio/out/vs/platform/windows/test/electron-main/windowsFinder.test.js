/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { join } from '../../../../base/common/path.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { findWindowOnFile } from '../../electron-main/windowsFinder.js';
import { toWorkspaceFolders } from '../../../workspaces/common/workspaces.js';
import { FileAccess } from '../../../../base/common/network.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('WindowsFinder', () => {
    const fixturesFolder = FileAccess.asFileUri('vs/platform/windows/test/electron-main/fixtures').fsPath;
    const testWorkspace = {
        id: Date.now().toString(),
        configPath: URI.file(join(fixturesFolder, 'workspaces.json'))
    };
    const testWorkspaceFolders = toWorkspaceFolders([{ path: join(fixturesFolder, 'vscode_workspace_1_folder') }, { path: join(fixturesFolder, 'vscode_workspace_2_folder') }], testWorkspace.configPath, extUriBiasedIgnorePathCase);
    const localWorkspaceResolver = async (workspace) => { return workspace === testWorkspace ? { id: testWorkspace.id, configPath: workspace.configPath, folders: testWorkspaceFolders } : undefined; };
    function createTestCodeWindow(options) {
        return new class {
            constructor() {
                this.onWillLoad = Event.None;
                this.onDidMaximize = Event.None;
                this.onDidUnmaximize = Event.None;
                this.onDidTriggerSystemContextMenu = Event.None;
                this.onDidSignalReady = Event.None;
                this.onDidClose = Event.None;
                this.onDidDestroy = Event.None;
                this.onDidEnterFullScreen = Event.None;
                this.onDidLeaveFullScreen = Event.None;
                this.whenClosedOrLoaded = Promise.resolve();
                this.id = -1;
                this.win = null;
                this.openedWorkspace = options.openedFolderUri ? { id: '', uri: options.openedFolderUri } : options.openedWorkspace;
                this.isExtensionDevelopmentHost = false;
                this.isExtensionTestHost = false;
                this.lastFocusTime = options.lastFocusTime;
                this.isFullScreen = false;
                this.isReady = true;
            }
            ready() { throw new Error('Method not implemented.'); }
            setReady() { throw new Error('Method not implemented.'); }
            addTabbedWindow(window) { throw new Error('Method not implemented.'); }
            load(config, options) { throw new Error('Method not implemented.'); }
            reload(cli) { throw new Error('Method not implemented.'); }
            focus(options) { throw new Error('Method not implemented.'); }
            close() { throw new Error('Method not implemented.'); }
            getBounds() { throw new Error('Method not implemented.'); }
            send(channel, ...args) { throw new Error('Method not implemented.'); }
            sendWhenReady(channel, token, ...args) { throw new Error('Method not implemented.'); }
            toggleFullScreen() { throw new Error('Method not implemented.'); }
            setRepresentedFilename(name) { throw new Error('Method not implemented.'); }
            getRepresentedFilename() { throw new Error('Method not implemented.'); }
            setDocumentEdited(edited) { throw new Error('Method not implemented.'); }
            isDocumentEdited() { throw new Error('Method not implemented.'); }
            updateTouchBar(items) { throw new Error('Method not implemented.'); }
            serializeWindowState() { throw new Error('Method not implemented'); }
            updateWindowControls(options) { throw new Error('Method not implemented.'); }
            notifyZoomLevel(level) { throw new Error('Method not implemented.'); }
            matches(webContents) { throw new Error('Method not implemented.'); }
            dispose() { }
        };
    }
    const vscodeFolderWindow = createTestCodeWindow({ lastFocusTime: 1, openedFolderUri: URI.file(join(fixturesFolder, 'vscode_folder')) });
    const lastActiveWindow = createTestCodeWindow({ lastFocusTime: 3, openedFolderUri: undefined });
    const noVscodeFolderWindow = createTestCodeWindow({ lastFocusTime: 2, openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder')) });
    const windows = [
        vscodeFolderWindow,
        lastActiveWindow,
        noVscodeFolderWindow,
    ];
    test('New window without folder when no windows exist', async () => {
        assert.strictEqual(await findWindowOnFile([], URI.file('nonexisting'), localWorkspaceResolver), undefined);
        assert.strictEqual(await findWindowOnFile([], URI.file(join(fixturesFolder, 'no_vscode_folder', 'file.txt')), localWorkspaceResolver), undefined);
    });
    test('Existing window with folder', async () => {
        assert.strictEqual(await findWindowOnFile(windows, URI.file(join(fixturesFolder, 'no_vscode_folder', 'file.txt')), localWorkspaceResolver), noVscodeFolderWindow);
        assert.strictEqual(await findWindowOnFile(windows, URI.file(join(fixturesFolder, 'vscode_folder', 'file.txt')), localWorkspaceResolver), vscodeFolderWindow);
        const window = createTestCodeWindow({ lastFocusTime: 1, openedFolderUri: URI.file(join(fixturesFolder, 'vscode_folder', 'nested_folder')) });
        assert.strictEqual(await findWindowOnFile([window], URI.file(join(fixturesFolder, 'vscode_folder', 'nested_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), window);
    });
    test('More specific existing window wins', async () => {
        const window = createTestCodeWindow({ lastFocusTime: 2, openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder')) });
        const nestedFolderWindow = createTestCodeWindow({ lastFocusTime: 1, openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder', 'nested_folder')) });
        assert.strictEqual(await findWindowOnFile([window, nestedFolderWindow], URI.file(join(fixturesFolder, 'no_vscode_folder', 'nested_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), nestedFolderWindow);
    });
    test('Workspace folder wins', async () => {
        const window = createTestCodeWindow({ lastFocusTime: 1, openedWorkspace: testWorkspace });
        assert.strictEqual(await findWindowOnFile([window], URI.file(join(fixturesFolder, 'vscode_workspace_2_folder', 'nested_vscode_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), window);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy90ZXN0L2VsZWN0cm9uLW1haW4vd2luZG93c0ZpbmRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUs3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFFM0IsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUV0RyxNQUFNLGFBQWEsR0FBeUI7UUFDM0MsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDekIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0tBQzdELENBQUM7SUFFRixNQUFNLG9CQUFvQixHQUFH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
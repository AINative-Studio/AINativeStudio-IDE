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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvdGVzdC9lbGVjdHJvbi1tYWluL3dpbmRvd3NGaW5kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFVLE1BQU0sZ0NBQWdDLENBQUM7QUFLN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQUM7SUFFdEcsTUFBTSxhQUFhLEdBQXlCO1FBQzNDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFO1FBQ3pCLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztLQUM3RCxDQUFDO0lBRUYsTUFBTSxvQkFBb0IsR0FB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
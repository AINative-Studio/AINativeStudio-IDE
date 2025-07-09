/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/processExplorer.css';
import '../../../base/browser/ui/codicons/codiconStyles.js'; // make sure codicon css is loaded
import { localize } from '../../../nls.js';
import { $, append } from '../../../base/browser/dom.js';
import { createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { DataTree } from '../../../base/browser/ui/tree/dataTree.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { popup } from '../../../base/parts/contextmenu/electron-sandbox/contextmenu.js';
import { ipcRenderer } from '../../../base/parts/sandbox/electron-sandbox/globals.js';
import { isRemoteDiagnosticError } from '../../../platform/diagnostics/common/diagnostics.js';
import { ByteSize } from '../../../platform/files/common/files.js';
import { ElectronIPCMainProcessService } from '../../../platform/ipc/electron-sandbox/mainProcessService.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { getIconsStyleSheet } from '../../../platform/theme/browser/iconsStyleSheet.js';
import { applyZoom, zoomIn, zoomOut } from '../../../platform/window/electron-sandbox/window.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { mainWindow } from '../../../base/browser/window.js';
const DEBUG_FLAGS_PATTERN = /\s--inspect(?:-brk|port)?=(?<port>\d+)?/;
const DEBUG_PORT_PATTERN = /\s--inspect-port=(?<port>\d+)/;
class ProcessListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (isProcessItem(element)) {
            return 'process';
        }
        if (isMachineProcessInformation(element)) {
            return 'machine';
        }
        if (isRemoteDiagnosticError(element)) {
            return 'error';
        }
        if (isProcessInformation(element)) {
            return 'header';
        }
        return '';
    }
}
class ProcessTreeDataSource {
    hasChildren(element) {
        if (isRemoteDiagnosticError(element)) {
            return false;
        }
        if (isProcessItem(element)) {
            return !!element.children?.length;
        }
        else {
            return true;
        }
    }
    getChildren(element) {
        if (isProcessItem(element)) {
            return element.children ? element.children : [];
        }
        if (isRemoteDiagnosticError(element)) {
            return [];
        }
        if (isProcessInformation(element)) {
            // If there are multiple process roots, return these, otherwise go directly to the root process
            if (element.processRoots.length > 1) {
                return element.processRoots;
            }
            else {
                return [element.processRoots[0].rootProcess];
            }
        }
        if (isMachineProcessInformation(element)) {
            return [element.rootProcess];
        }
        return [element.processes];
    }
}
class ProcessHeaderTreeRenderer {
    constructor() {
        this.templateId = 'header';
    }
    renderTemplate(container) {
        const row = append(container, $('.row'));
        const name = append(row, $('.nameLabel'));
        const CPU = append(row, $('.cpu'));
        const memory = append(row, $('.memory'));
        const PID = append(row, $('.pid'));
        return { name, CPU, memory, PID };
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = localize('name', "Process Name");
        templateData.CPU.textContent = localize('cpu', "CPU (%)");
        templateData.PID.textContent = localize('pid', "PID");
        templateData.memory.textContent = localize('memory', "Memory (MB)");
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class MachineRenderer {
    constructor() {
        this.templateId = 'machine';
    }
    renderTemplate(container) {
        const data = Object.create(null);
        const row = append(container, $('.row'));
        data.name = append(row, $('.nameLabel'));
        return data;
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = node.element.name;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ErrorRenderer {
    constructor() {
        this.templateId = 'error';
    }
    renderTemplate(container) {
        const data = Object.create(null);
        const row = append(container, $('.row'));
        data.name = append(row, $('.nameLabel'));
        return data;
    }
    renderElement(node, index, templateData, height) {
        templateData.name.textContent = node.element.errorMessage;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ProcessRenderer {
    constructor(platform, totalMem, mapPidToName) {
        this.platform = platform;
        this.totalMem = totalMem;
        this.mapPidToName = mapPidToName;
        this.templateId = 'process';
    }
    renderTemplate(container) {
        const row = append(container, $('.row'));
        const name = append(row, $('.nameLabel'));
        const CPU = append(row, $('.cpu'));
        const memory = append(row, $('.memory'));
        const PID = append(row, $('.pid'));
        return { name, CPU, PID, memory };
    }
    renderElement(node, index, templateData, height) {
        const { element } = node;
        const pid = element.pid.toFixed(0);
        let name = element.name;
        if (this.mapPidToName.has(element.pid)) {
            name = this.mapPidToName.get(element.pid);
        }
        templateData.name.textContent = name;
        templateData.name.title = element.cmd;
        templateData.CPU.textContent = element.load.toFixed(0);
        templateData.PID.textContent = pid;
        templateData.PID.parentElement.id = `pid-${pid}`;
        const memory = this.platform === 'win32' ? element.mem : (this.totalMem * (element.mem / 100));
        templateData.memory.textContent = (memory / ByteSize.MB).toFixed(0);
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
function isMachineProcessInformation(item) {
    return !!item.name && !!item.rootProcess;
}
function isProcessInformation(item) {
    return !!item.processRoots;
}
function isProcessItem(item) {
    return !!item.pid;
}
class ProcessExplorer {
    constructor(windowId, data) {
        this.data = data;
        this.mapPidToName = new Map();
        const mainProcessService = new ElectronIPCMainProcessService(windowId);
        this.nativeHostService = new NativeHostService(windowId, mainProcessService);
        this.applyStyles(data.styles);
        this.setEventHandlers(data);
        ipcRenderer.on('vscode:pidToNameResponse', (event, pidToNames) => {
            this.mapPidToName.clear();
            for (const [pid, name] of pidToNames) {
                this.mapPidToName.set(pid, name);
            }
        });
        ipcRenderer.on('vscode:listProcessesResponse', async (event, processRoots) => {
            processRoots.forEach((info, index) => {
                if (isProcessItem(info.rootProcess)) {
                    info.rootProcess.name = index === 0 ? `${this.data.applicationName} main` : 'remote agent';
                }
            });
            if (!this.tree) {
                await this.createProcessTree(processRoots);
            }
            else {
                this.tree.setInput({ processes: { processRoots } });
                this.tree.layout(mainWindow.innerHeight, mainWindow.innerWidth);
            }
            this.requestProcessList(0);
        });
        this.lastRequestTime = Date.now();
        ipcRenderer.send('vscode:pidToNameRequest');
        ipcRenderer.send('vscode:listProcesses');
    }
    setEventHandlers(data) {
        mainWindow.document.onkeydown = (e) => {
            const cmdOrCtrlKey = data.platform === 'darwin' ? e.metaKey : e.ctrlKey;
            // Cmd/Ctrl + w closes issue window
            if (cmdOrCtrlKey && e.keyCode === 87) {
                e.stopPropagation();
                e.preventDefault();
                ipcRenderer.send('vscode:closeProcessExplorer');
            }
            // Cmd/Ctrl + zooms in
            if (cmdOrCtrlKey && e.keyCode === 187) {
                zoomIn(mainWindow);
            }
            // Cmd/Ctrl - zooms out
            if (cmdOrCtrlKey && e.keyCode === 189) {
                zoomOut(mainWindow);
            }
        };
    }
    async createProcessTree(processRoots) {
        const container = mainWindow.document.getElementById('process-list');
        if (!container) {
            return;
        }
        const { totalmem } = await this.nativeHostService.getOSStatistics();
        const renderers = [
            new ProcessRenderer(this.data.platform, totalmem, this.mapPidToName),
            new ProcessHeaderTreeRenderer(),
            new MachineRenderer(),
            new ErrorRenderer()
        ];
        this.tree = new DataTree('processExplorer', container, new ProcessListDelegate(), renderers, new ProcessTreeDataSource(), {
            identityProvider: {
                getId: (element) => {
                    if (isProcessItem(element)) {
                        return element.pid.toString();
                    }
                    if (isRemoteDiagnosticError(element)) {
                        return element.hostName;
                    }
                    if (isProcessInformation(element)) {
                        return 'processes';
                    }
                    if (isMachineProcessInformation(element)) {
                        return element.name;
                    }
                    return 'header';
                }
            }
        });
        this.tree.setInput({ processes: { processRoots } });
        this.tree.layout(mainWindow.innerHeight, mainWindow.innerWidth);
        this.tree.onKeyDown(e => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 35 /* KeyCode.KeyE */ && event.altKey) {
                const selectionPids = this.getSelectedPids();
                void Promise.all(selectionPids.map((pid) => this.nativeHostService.killProcess(pid, 'SIGTERM'))).then(() => this.tree?.refresh());
            }
        });
        this.tree.onContextMenu(e => {
            if (isProcessItem(e.element)) {
                this.showContextMenu(e.element, true);
            }
        });
        container.style.height = `${mainWindow.innerHeight}px`;
        mainWindow.addEventListener('resize', () => {
            container.style.height = `${mainWindow.innerHeight}px`;
            this.tree?.layout(mainWindow.innerHeight, mainWindow.innerWidth);
        });
    }
    isDebuggable(cmd) {
        const matches = DEBUG_FLAGS_PATTERN.exec(cmd);
        return (matches && matches.groups.port !== '0') || cmd.indexOf('node ') >= 0 || cmd.indexOf('node.exe') >= 0;
    }
    attachTo(item) {
        const config = {
            type: 'node',
            request: 'attach',
            name: `process ${item.pid}`
        };
        let matches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port);
        }
        else {
            // no port -> try to attach via pid (send SIGUSR1)
            config.processId = String(item.pid);
        }
        // a debug-port=n or inspect-port=n overrides the port
        matches = DEBUG_PORT_PATTERN.exec(item.cmd);
        if (matches) {
            // override port
            config.port = Number(matches.groups.port);
        }
        ipcRenderer.send('vscode:workbenchCommand', { id: 'debug.startFromConfig', from: 'processExplorer', args: [config] });
    }
    applyStyles(styles) {
        const styleElement = createStyleSheet();
        const content = [];
        if (styles.listFocusBackground) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list:focus .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`);
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list:focus .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list:focus .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`);
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list:focus .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list-row:hover:not(.selected):not(.focused) { background-color: ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list-row:hover:not(.selected):not(.focused) { color: ${styles.listHoverForeground}; }`);
        }
        if (styles.listFocusOutline) {
            content.push(`.monaco-list:focus .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            content.push(`.monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        // Scrollbars
        if (styles.scrollbarShadowColor) {
            content.push(`
				.monaco-scrollable-element > .shadow.top {
					box-shadow: ${styles.scrollbarShadowColor} 0 6px 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.left {
					box-shadow: ${styles.scrollbarShadowColor} 6px 0 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.top.left {
					box-shadow: ${styles.scrollbarShadowColor} 6px 6px 6px -6px inset;
				}
			`);
        }
        if (styles.scrollbarSliderBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider {
					background: ${styles.scrollbarSliderBackgroundColor};
				}
			`);
        }
        if (styles.scrollbarSliderHoverBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider:hover {
					background: ${styles.scrollbarSliderHoverBackgroundColor};
				}
			`);
        }
        if (styles.scrollbarSliderActiveBackgroundColor) {
            content.push(`
				.monaco-scrollable-element > .scrollbar > .slider.active {
					background: ${styles.scrollbarSliderActiveBackgroundColor};
				}
			`);
        }
        styleElement.textContent = content.join('\n');
        if (styles.color) {
            mainWindow.document.body.style.color = styles.color;
        }
    }
    showContextMenu(item, isLocal) {
        const items = [];
        const pid = Number(item.pid);
        if (isLocal) {
            items.push({
                accelerator: 'Alt+E',
                label: localize('killProcess', "Kill Process"),
                click: () => {
                    this.nativeHostService.killProcess(pid, 'SIGTERM');
                }
            });
            items.push({
                label: localize('forceKillProcess', "Force Kill Process"),
                click: () => {
                    this.nativeHostService.killProcess(pid, 'SIGKILL');
                }
            });
            items.push({
                type: 'separator'
            });
        }
        items.push({
            label: localize('copy', "Copy"),
            click: () => {
                // Collect the selected pids
                const selectionPids = this.getSelectedPids();
                // If the selection does not contain the right clicked item, copy the right clicked
                // item only.
                if (!selectionPids?.includes(pid)) {
                    selectionPids.length = 0;
                    selectionPids.push(pid);
                }
                const rows = selectionPids?.map(e => mainWindow.document.getElementById(`pid-${e}`)).filter(e => !!e);
                if (rows) {
                    const text = rows.map(e => e.innerText).filter(e => !!e);
                    this.nativeHostService.writeClipboardText(text.join('\n'));
                }
            }
        });
        items.push({
            label: localize('copyAll', "Copy All"),
            click: () => {
                const processList = mainWindow.document.getElementById('process-list');
                if (processList) {
                    this.nativeHostService.writeClipboardText(processList.innerText);
                }
            }
        });
        if (item && isLocal && this.isDebuggable(item.cmd)) {
            items.push({
                type: 'separator'
            });
            items.push({
                label: localize('debug', "Debug"),
                click: () => {
                    this.attachTo(item);
                }
            });
        }
        popup(items);
    }
    requestProcessList(totalWaitTime) {
        setTimeout(() => {
            const nextRequestTime = Date.now();
            const waited = totalWaitTime + nextRequestTime - this.lastRequestTime;
            this.lastRequestTime = nextRequestTime;
            // Wait at least a second between requests.
            if (waited > 1000) {
                ipcRenderer.send('vscode:pidToNameRequest');
                ipcRenderer.send('vscode:listProcesses');
            }
            else {
                this.requestProcessList(waited);
            }
        }, 200);
    }
    getSelectedPids() {
        return this.tree?.getSelection()?.map(e => {
            if (!e || !('pid' in e)) {
                return undefined;
            }
            return e.pid;
        }).filter(e => !!e);
    }
}
function createCodiconStyleSheet() {
    const codiconStyleSheet = createStyleSheet();
    codiconStyleSheet.id = 'codiconStyles';
    const iconsStyleSheet = getIconsStyleSheet(undefined);
    function updateAll() {
        codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
    }
    const delayer = new RunOnceScheduler(updateAll, 0);
    iconsStyleSheet.onDidChange(() => delayer.schedule());
    delayer.schedule();
}
export function startup(configuration) {
    const platformClass = configuration.data.platform === 'win32' ? 'windows' : configuration.data.platform === 'linux' ? 'linux' : 'mac';
    mainWindow.document.body.classList.add(platformClass); // used by our fonts
    createCodiconStyleSheet();
    applyZoom(configuration.data.zoomLevel, mainWindow);
    new ProcessExplorer(configuration.windowId, configuration.data);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyTWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXNhbmRib3gvcHJvY2Vzc0V4cGxvcmVyL3Byb2Nlc3NFeHBsb3Jlck1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLG9EQUFvRCxDQUFDLENBQUMsa0NBQWtDO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUdqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9BQU8sRUFBMEIsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFHN0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdELE1BQU0sbUJBQW1CLEdBQUcseUNBQXlDLENBQUM7QUFDdEUsTUFBTSxrQkFBa0IsR0FBRywrQkFBK0IsQ0FBQztBQUUzRCxNQUFNLG1CQUFtQjtJQUN4QixTQUFTLENBQUMsT0FBeUU7UUFDbEYsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQThGO1FBQzNHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztDQUNEO0FBWUQsTUFBTSxxQkFBcUI7SUFDMUIsV0FBVyxDQUFDLE9BQTRHO1FBQ3ZILElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1FBQ25DLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUE0RztRQUN2SCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pELENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ25DLCtGQUErRjtZQUMvRixJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUM7WUFDN0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSx5QkFBeUI7SUFBL0I7UUFDQyxlQUFVLEdBQVcsUUFBUSxDQUFDO0lBc0IvQixDQUFDO0lBcEJBLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBeUMsRUFBRSxLQUFhLEVBQUUsWUFBc0MsRUFBRSxNQUEwQjtRQUN6SSxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUQsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxZQUFZLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRXJFLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBaUI7UUFDaEMsZ0JBQWdCO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sZUFBZTtJQUFyQjtRQUNDLGVBQVUsR0FBVyxTQUFTLENBQUM7SUFhaEMsQ0FBQztJQVpBLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELGFBQWEsQ0FBQyxJQUFnRCxFQUFFLEtBQWEsRUFBRSxZQUFxQyxFQUFFLE1BQTBCO1FBQy9JLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ25ELENBQUM7SUFDRCxlQUFlLENBQUMsWUFBcUM7UUFDcEQsZ0JBQWdCO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sYUFBYTtJQUFuQjtRQUNDLGVBQVUsR0FBVyxPQUFPLENBQUM7SUFhOUIsQ0FBQztJQVpBLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELGFBQWEsQ0FBQyxJQUE2QyxFQUFFLEtBQWEsRUFBRSxZQUFxQyxFQUFFLE1BQTBCO1FBQzVJLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO0lBQzNELENBQUM7SUFDRCxlQUFlLENBQUMsWUFBcUM7UUFDcEQsZ0JBQWdCO0lBQ2pCLENBQUM7Q0FDRDtBQUdELE1BQU0sZUFBZTtJQUNwQixZQUFvQixRQUFnQixFQUFVLFFBQWdCLEVBQVUsWUFBaUM7UUFBckYsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUFVLGFBQVEsR0FBUixRQUFRLENBQVE7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBcUI7UUFFekcsZUFBVSxHQUFXLFNBQVMsQ0FBQztJQUY4RSxDQUFDO0lBRzlHLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXpDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFbkMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFDRCxhQUFhLENBQUMsSUFBa0MsRUFBRSxLQUFhLEVBQUUsWUFBc0MsRUFBRSxNQUEwQjtRQUNsSSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXpCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5DLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDeEIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBRSxDQUFDO1FBQzVDLENBQUM7UUFFRCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDckMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUV0QyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RCxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7UUFDbkMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUMsRUFBRSxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvRixZQUFZLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBc0M7UUFDckQsZ0JBQWdCO0lBQ2pCLENBQUM7Q0FDRDtBQWVELFNBQVMsMkJBQTJCLENBQUMsSUFBUztJQUM3QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0FBQzFDLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQVM7SUFDdEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBUztJQUMvQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ25CLENBQUM7QUFFRCxNQUFNLGVBQWU7SUFTcEIsWUFBWSxRQUFnQixFQUFVLElBQXlCO1FBQXpCLFNBQUksR0FBSixJQUFJLENBQXFCO1FBTnZELGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFPaEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBdUIsQ0FBQztRQUVuRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFNUIsV0FBVyxDQUFDLEVBQUUsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLEtBQWMsRUFBRSxVQUE4QixFQUFFLEVBQUU7WUFDN0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUUxQixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxXQUFXLENBQUMsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEtBQUssRUFBRSxLQUFjLEVBQUUsWUFBeUMsRUFBRSxFQUFFO1lBQ2xILFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztnQkFDNUYsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDNUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqRSxDQUFDO1lBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEMsV0FBVyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVDLFdBQVcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsSUFBeUI7UUFDakQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFnQixFQUFFLEVBQUU7WUFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFFeEUsbUNBQW1DO1lBQ25DLElBQUksWUFBWSxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUVuQixXQUFXLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDakQsQ0FBQztZQUVELHNCQUFzQjtZQUN0QixJQUFJLFlBQVksSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEIsQ0FBQztZQUVELHVCQUF1QjtZQUN2QixJQUFJLFlBQVksSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsWUFBeUM7UUFDeEUsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXBFLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3BFLElBQUkseUJBQXlCLEVBQUU7WUFDL0IsSUFBSSxlQUFlLEVBQUU7WUFDckIsSUFBSSxhQUFhLEVBQUU7U0FDbkIsQ0FBQztRQUVGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsaUJBQWlCLEVBQ3pDLFNBQVMsRUFDVCxJQUFJLG1CQUFtQixFQUFFLEVBQ3pCLFNBQVMsRUFDVCxJQUFJLHFCQUFxQixFQUFFLEVBQzNCO1lBQ0MsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDLE9BQTRHLEVBQUUsRUFBRTtvQkFDdkgsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMvQixDQUFDO29CQUVELElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDdEMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDO29CQUN6QixDQUFDO29CQUVELElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDbkMsT0FBTyxXQUFXLENBQUM7b0JBQ3BCLENBQUM7b0JBRUQsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLENBQUM7b0JBRUQsT0FBTyxRQUFRLENBQUM7Z0JBQ2pCLENBQUM7YUFDRDtTQUNELENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxLQUFLLENBQUMsT0FBTywwQkFBaUIsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDN0MsS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ25JLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNCLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsV0FBVyxJQUFJLENBQUM7UUFFdkQsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDMUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsV0FBVyxJQUFJLENBQUM7WUFDdkQsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sWUFBWSxDQUFDLEdBQVc7UUFDL0IsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU8sQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0csQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFpQjtRQUNqQyxNQUFNLE1BQU0sR0FBUTtZQUNuQixJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxXQUFXLElBQUksQ0FBQyxHQUFHLEVBQUU7U0FDM0IsQ0FBQztRQUVGLElBQUksT0FBTyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQzthQUFNLENBQUM7WUFDUCxrREFBa0Q7WUFDbEQsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsT0FBTyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLGdCQUFnQjtZQUNoQixNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRCxXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdkgsQ0FBQztJQUVPLFdBQVcsQ0FBQyxNQUE2QjtRQUNoRCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUU3QixJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUVBQW1FLE1BQU0sQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLENBQUM7WUFDakgsT0FBTyxDQUFDLElBQUksQ0FBQyx5RUFBeUUsTUFBTSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQztRQUN4SCxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLHdEQUF3RCxNQUFNLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxDQUFDO1FBQ3ZHLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0VBQW9FLE1BQU0sQ0FBQyw2QkFBNkIsS0FBSyxDQUFDLENBQUM7WUFDNUgsT0FBTyxDQUFDLElBQUksQ0FBQywwRUFBMEUsTUFBTSxDQUFDLDZCQUE2QixLQUFLLENBQUMsQ0FBQztRQUNuSSxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxNQUFNLENBQUMsNkJBQTZCLEtBQUssQ0FBQyxDQUFDO1FBQ2xILENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkVBQTJFLE1BQU0sQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLENBQUM7UUFDMUgsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxnRUFBZ0UsTUFBTSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQztRQUMvRyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLG9FQUFvRSxNQUFNLENBQUMsZ0JBQWdCLDJCQUEyQixDQUFDLENBQUM7UUFDdEksQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxnREFBZ0QsTUFBTSxDQUFDLGdCQUFnQiwyQkFBMkIsQ0FBQyxDQUFDO1FBQ2xILENBQUM7UUFFRCxhQUFhO1FBQ2IsSUFBSSxNQUFNLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDOzttQkFFRyxNQUFNLENBQUMsb0JBQW9COzs7O21CQUkzQixNQUFNLENBQUMsb0JBQW9COzs7O21CQUkzQixNQUFNLENBQUMsb0JBQW9COztJQUUxQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDOzttQkFFRyxNQUFNLENBQUMsOEJBQThCOztJQUVwRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsbUNBQW1DLEVBQUUsQ0FBQztZQUNoRCxPQUFPLENBQUMsSUFBSSxDQUFDOzttQkFFRyxNQUFNLENBQUMsbUNBQW1DOztJQUV6RCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsb0NBQW9DLEVBQUUsQ0FBQztZQUNqRCxPQUFPLENBQUMsSUFBSSxDQUFDOzttQkFFRyxNQUFNLENBQUMsb0NBQW9DOztJQUUxRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsWUFBWSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTlDLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xCLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxJQUFpQixFQUFFLE9BQWdCO1FBQzFELE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUM7UUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU3QixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixXQUFXLEVBQUUsT0FBTztnQkFDcEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDO2dCQUM5QyxLQUFLLEVBQUUsR0FBRyxFQUFFO29CQUNYLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDO2dCQUN6RCxLQUFLLEVBQUUsR0FBRyxFQUFFO29CQUNYLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsV0FBVzthQUNqQixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUMvQixLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNYLDRCQUE0QjtnQkFDNUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUM3QyxtRkFBbUY7Z0JBQ25GLGFBQWE7Z0JBQ2IsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3pCLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pCLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQWtCLENBQUM7Z0JBQ3ZILElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFhLENBQUM7b0JBQ3JFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzVELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUN0QyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNYLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUN2RSxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BELEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1YsSUFBSSxFQUFFLFdBQVc7YUFDakIsQ0FBQyxDQUFDO1lBRUgsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7Z0JBQ2pDLEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsQ0FBQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDZCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsYUFBcUI7UUFDL0MsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuQyxNQUFNLE1BQU0sR0FBRyxhQUFhLEdBQUcsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDdEUsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7WUFFdkMsMkNBQTJDO1lBQzNDLElBQUksTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUNuQixXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7Z0JBQzVDLFdBQVcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUMxQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRU8sZUFBZTtRQUN0QixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6QixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBYSxDQUFDO0lBQ2pDLENBQUM7Q0FDRDtBQUVELFNBQVMsdUJBQXVCO0lBQy9CLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUM3QyxpQkFBaUIsQ0FBQyxFQUFFLEdBQUcsZUFBZSxDQUFDO0lBRXZDLE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RELFNBQVMsU0FBUztRQUNqQixpQkFBaUIsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzFELENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRCxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNwQixDQUFDO0FBTUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxhQUFpRDtJQUN4RSxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUN0SSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0lBQzNFLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRXBELElBQUksZUFBZSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLENBQUMifQ==
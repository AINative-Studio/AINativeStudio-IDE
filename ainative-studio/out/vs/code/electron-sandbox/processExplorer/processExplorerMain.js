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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyTWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tc2FuZGJveC9wcm9jZXNzRXhwbG9yZXIvcHJvY2Vzc0V4cGxvcmVyTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sb0RBQW9ELENBQUMsQ0FBQyxrQ0FBa0M7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdEYsT0FBTyxFQUEwQix1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUc3RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsTUFBTSxtQkFBbUIsR0FBRyx5Q0FBeUMsQ0FBQztBQUN0RSxNQUFNLGtCQUFrQixHQUFHLCtCQUErQixDQUFDO0FBRTNELE1BQU0sbUJBQW1CO0lBQ3hCLFNBQVMsQ0FBQyxPQUF5RTtRQUNsRixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBOEY7UUFDM0csSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUVELElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0NBQ0Q7QUFZRCxNQUFNLHFCQUFxQjtJQUMxQixXQUFXLENBQUMsT0FBNEc7UUFDdkgsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7UUFDbkMsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQTRHO1FBQ3ZILElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakQsQ0FBQztRQUVELElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsK0ZBQStGO1lBQy9GLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQztZQUM3QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDOUMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHlCQUF5QjtJQUEvQjtRQUNDLGVBQVUsR0FBVyxRQUFRLENBQUM7SUFzQi9CLENBQUM7SUFwQkEsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNuQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUF5QyxFQUFFLEtBQWEsRUFBRSxZQUFzQyxFQUFFLE1BQTBCO1FBQ3pJLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFFckUsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFpQjtRQUNoQyxnQkFBZ0I7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxlQUFlO0lBQXJCO1FBQ0MsZUFBVSxHQUFXLFNBQVMsQ0FBQztJQWFoQyxDQUFDO0lBWkEsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsYUFBYSxDQUFDLElBQWdELEVBQUUsS0FBYSxFQUFFLFlBQXFDLEVBQUUsTUFBMEI7UUFDL0ksWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDbkQsQ0FBQztJQUNELGVBQWUsQ0FBQyxZQUFxQztRQUNwRCxnQkFBZ0I7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxhQUFhO0lBQW5CO1FBQ0MsZUFBVSxHQUFXLE9BQU8sQ0FBQztJQWE5QixDQUFDO0lBWkEsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsYUFBYSxDQUFDLElBQTZDLEVBQUUsS0FBYSxFQUFFLFlBQXFDLEVBQUUsTUFBMEI7UUFDNUksWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDM0QsQ0FBQztJQUNELGVBQWUsQ0FBQyxZQUFxQztRQUNwRCxnQkFBZ0I7SUFDakIsQ0FBQztDQUNEO0FBR0QsTUFBTSxlQUFlO0lBQ3BCLFlBQW9CLFFBQWdCLEVBQVUsUUFBZ0IsRUFBVSxZQUFpQztRQUFyRixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQUV6RyxlQUFVLEdBQVcsU0FBUyxDQUFDO0lBRjhFLENBQUM7SUFHOUcsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFekMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUVuQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUNELGFBQWEsQ0FBQyxJQUFrQyxFQUFFLEtBQWEsRUFBRSxZQUFzQyxFQUFFLE1BQTBCO1FBQ2xJLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFekIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN4QixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hDLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFFLENBQUM7UUFDNUMsQ0FBQztRQUVELFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUNyQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBRXRDLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztRQUNuQyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxFQUFFLEdBQUcsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9GLFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFzQztRQUNyRCxnQkFBZ0I7SUFDakIsQ0FBQztDQUNEO0FBZUQsU0FBUywyQkFBMkIsQ0FBQyxJQUFTO0lBQzdDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDMUMsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBUztJQUN0QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFTO0lBQy9CLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDbkIsQ0FBQztBQUVELE1BQU0sZUFBZTtJQVNwQixZQUFZLFFBQWdCLEVBQVUsSUFBeUI7UUFBekIsU0FBSSxHQUFKLElBQUksQ0FBcUI7UUFOdkQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQU9oRCxNQUFNLGtCQUFrQixHQUFHLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUF1QixDQUFDO1FBRW5HLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU1QixXQUFXLENBQUMsRUFBRSxDQUFDLDBCQUEwQixFQUFFLENBQUMsS0FBYyxFQUFFLFVBQThCLEVBQUUsRUFBRTtZQUM3RixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRTFCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxFQUFFLENBQUMsOEJBQThCLEVBQUUsS0FBSyxFQUFFLEtBQWMsRUFBRSxZQUF5QyxFQUFFLEVBQUU7WUFDbEgsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUM1RixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLENBQUM7WUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQyxXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDNUMsV0FBVyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUF5QjtRQUNqRCxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQWdCLEVBQUUsRUFBRTtZQUNwRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUV4RSxtQ0FBbUM7WUFDbkMsSUFBSSxZQUFZLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBRW5CLFdBQVcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztZQUNqRCxDQUFDO1lBRUQsc0JBQXNCO1lBQ3RCLElBQUksWUFBWSxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQixDQUFDO1lBRUQsdUJBQXVCO1lBQ3ZCLElBQUksWUFBWSxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxZQUF5QztRQUN4RSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFcEUsTUFBTSxTQUFTLEdBQUc7WUFDakIsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDcEUsSUFBSSx5QkFBeUIsRUFBRTtZQUMvQixJQUFJLGVBQWUsRUFBRTtZQUNyQixJQUFJLGFBQWEsRUFBRTtTQUNuQixDQUFDO1FBRUYsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFDekMsU0FBUyxFQUNULElBQUksbUJBQW1CLEVBQUUsRUFDekIsU0FBUyxFQUNULElBQUkscUJBQXFCLEVBQUUsRUFDM0I7WUFDQyxnQkFBZ0IsRUFBRTtnQkFDakIsS0FBSyxFQUFFLENBQUMsT0FBNEcsRUFBRSxFQUFFO29CQUN2SCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUM1QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQy9CLENBQUM7b0JBRUQsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUN0QyxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUM7b0JBQ3pCLENBQUM7b0JBRUQsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUNuQyxPQUFPLFdBQVcsQ0FBQztvQkFDcEIsQ0FBQztvQkFFRCxJQUFJLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQzFDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDckIsQ0FBQztvQkFFRCxPQUFPLFFBQVEsQ0FBQztnQkFDakIsQ0FBQzthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQyxJQUFJLEtBQUssQ0FBQyxPQUFPLDBCQUFpQixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUM3QyxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDbkksQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0IsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxXQUFXLElBQUksQ0FBQztRQUV2RCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUMxQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxXQUFXLElBQUksQ0FBQztZQUN2RCxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxZQUFZLENBQUMsR0FBVztRQUMvQixNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRyxDQUFDO0lBRU8sUUFBUSxDQUFDLElBQWlCO1FBQ2pDLE1BQU0sTUFBTSxHQUFRO1lBQ25CLElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLFFBQVE7WUFDakIsSUFBSSxFQUFFLFdBQVcsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUMzQixDQUFDO1FBRUYsSUFBSSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO2FBQU0sQ0FBQztZQUNQLGtEQUFrRDtZQUNsRCxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsZ0JBQWdCO1lBQ2hCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2SCxDQUFDO0lBRU8sV0FBVyxDQUFDLE1BQTZCO1FBQ2hELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixFQUFFLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBRTdCLElBQUksTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxtRUFBbUUsTUFBTSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQztZQUNqSCxPQUFPLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxNQUFNLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxDQUFDO1FBQ3hILENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0RBQXdELE1BQU0sQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLDZCQUE2QixFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLElBQUksQ0FBQyxvRUFBb0UsTUFBTSxDQUFDLDZCQUE2QixLQUFLLENBQUMsQ0FBQztZQUM1SCxPQUFPLENBQUMsSUFBSSxDQUFDLDBFQUEwRSxNQUFNLENBQUMsNkJBQTZCLEtBQUssQ0FBQyxDQUFDO1FBQ25JLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMseURBQXlELE1BQU0sQ0FBQyw2QkFBNkIsS0FBSyxDQUFDLENBQUM7UUFDbEgsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQywyRUFBMkUsTUFBTSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQztRQUMxSCxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdFQUFnRSxNQUFNLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxDQUFDO1FBQy9HLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0VBQW9FLE1BQU0sQ0FBQyxnQkFBZ0IsMkJBQTJCLENBQUMsQ0FBQztRQUN0SSxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLGdEQUFnRCxNQUFNLENBQUMsZ0JBQWdCLDJCQUEyQixDQUFDLENBQUM7UUFDbEgsQ0FBQztRQUVELGFBQWE7UUFDYixJQUFJLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUM7O21CQUVHLE1BQU0sQ0FBQyxvQkFBb0I7Ozs7bUJBSTNCLE1BQU0sQ0FBQyxvQkFBb0I7Ozs7bUJBSTNCLE1BQU0sQ0FBQyxvQkFBb0I7O0lBRTFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUM7O21CQUVHLE1BQU0sQ0FBQyw4QkFBOEI7O0lBRXBELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxtQ0FBbUMsRUFBRSxDQUFDO1lBQ2hELE9BQU8sQ0FBQyxJQUFJLENBQUM7O21CQUVHLE1BQU0sQ0FBQyxtQ0FBbUM7O0lBRXpELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUM7O21CQUVHLE1BQU0sQ0FBQyxvQ0FBb0M7O0lBRTFELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxZQUFZLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFOUMsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ3JELENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLElBQWlCLEVBQUUsT0FBZ0I7UUFDMUQsTUFBTSxLQUFLLEdBQXVCLEVBQUUsQ0FBQztRQUNyQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTdCLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLFdBQVcsRUFBRSxPQUFPO2dCQUNwQixLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUM7Z0JBQzlDLEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3BELENBQUM7YUFDRCxDQUFDLENBQUM7WUFFSCxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUM7Z0JBQ3pELEtBQUssRUFBRSxHQUFHLEVBQUU7b0JBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3BELENBQUM7YUFDRCxDQUFDLENBQUM7WUFFSCxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLElBQUksRUFBRSxXQUFXO2FBQ2pCLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1lBQy9CLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ1gsNEJBQTRCO2dCQUM1QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQzdDLG1GQUFtRjtnQkFDbkYsYUFBYTtnQkFDYixJQUFJLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNuQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFDekIsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekIsQ0FBQztnQkFDRCxNQUFNLElBQUksR0FBRyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBa0IsQ0FBQztnQkFDdkgsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQWEsQ0FBQztvQkFDckUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1lBQ3RDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ1gsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3ZFLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsV0FBVzthQUNqQixDQUFDLENBQUM7WUFFSCxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztnQkFDakMsS0FBSyxFQUFFLEdBQUcsRUFBRTtvQkFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNkLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxhQUFxQjtRQUMvQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ25DLE1BQU0sTUFBTSxHQUFHLGFBQWEsR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN0RSxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUV2QywyQ0FBMkM7WUFDM0MsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLFdBQVcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztnQkFDNUMsV0FBVyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzFDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNULENBQUM7SUFFTyxlQUFlO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFhLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBRUQsU0FBUyx1QkFBdUI7SUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO0lBQzdDLGlCQUFpQixDQUFDLEVBQUUsR0FBRyxlQUFlLENBQUM7SUFFdkMsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEQsU0FBUyxTQUFTO1FBQ2pCLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ25ELGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDdEQsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3BCLENBQUM7QUFNRCxNQUFNLFVBQVUsT0FBTyxDQUFDLGFBQWlEO0lBQ3hFLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ3RJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7SUFDM0UsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFcEQsSUFBSSxlQUFlLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakUsQ0FBQyJ9
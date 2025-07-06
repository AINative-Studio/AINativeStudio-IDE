/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isNative, OS } from '../../../../base/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { append, clearNode, $, h } from '../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isRecentFolder, IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ColorScheme } from '../../web.api.js';
import { OpenFileFolderAction, OpenFolderAction } from '../../actions/workspaceActions.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
/* eslint-disable */ // Void
import { VOID_CTRL_K_ACTION_ID, VOID_CTRL_L_ACTION_ID } from '../../../contrib/void/browser/actionIDs.js';
import { VIEWLET_ID as REMOTE_EXPLORER_VIEWLET_ID } from '../../../contrib/remote/browser/remoteExplorer.js';
/* eslint-enable */
// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }
// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };
// const openCopilotEdits: WatermarkEntry = { text: localize('watermark.openCopilotEdits', "Open Copilot Edits"), id: 'workbench.action.chat.openEditSession', when: { native: showCopilot, web: showCopilot } };
// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);
// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];
// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];
// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// 	openCopilotEdits
// ];
let EditorGroupWatermark = class EditorGroupWatermark extends Disposable {
    constructor(container, keybindingService, contextService, configurationService, themeService, workspacesService, commandService, hostService, labelService, viewsService) {
        super();
        this.keybindingService = keybindingService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.workspacesService = workspacesService;
        this.commandService = commandService;
        this.hostService = hostService;
        this.labelService = labelService;
        this.viewsService = viewsService;
        this.transientDisposables = this._register(new DisposableStore());
        this.currentDisposables = new Set();
        const elements = h('.editor-group-watermark', [
            h('.letterpress@icon'),
            h('.shortcuts@shortcuts'),
        ]);
        append(container, elements.root);
        this.shortcuts = elements.shortcuts; // shortcuts div is modified on render()
        // void icon style
        const updateTheme = () => {
            const theme = this.themeService.getColorTheme().type;
            const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK;
            elements.icon.style.maxWidth = '220px';
            elements.icon.style.opacity = '50%';
            elements.icon.style.filter = isDark ? '' : 'invert(1)'; //brightness(.5)
        };
        updateTheme();
        this._register(this.themeService.onDidColorThemeChange(updateTheme));
        this.registerListeners();
        this.workbenchState = contextService.getWorkbenchState();
        this.render();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.tips.enabled')) {
                this.render();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
            if (this.workbenchState === workbenchState) {
                return;
            }
            this.workbenchState = workbenchState;
            this.render();
        }));
        // const allEntriesWhenClauses = [...noFolderEntries, ...folderEntries].filter(entry => entry.when !== undefined).map(entry => entry.when!);
        // const allKeys = new Set<string>();
        // allEntriesWhenClauses.forEach(when => when.keys().forEach(key => allKeys.add(key)));
        // this._register(this.contextKeyService.onDidChangeContext(e => {
        // 	if (e.affectsSome(allKeys)) {
        // 		this.render();
        // 	}
        // }));
    }
    render() {
        this.clear();
        const voidIconBox = append(this.shortcuts, $('.watermark-box'));
        const recentsBox = append(this.shortcuts, $('div'));
        recentsBox.style.display = 'flex';
        recentsBox.style.flex = 'row';
        recentsBox.style.justifyContent = 'center';
        const update = async () => {
            // put async at top so don't need to wait (this prevents a jitter on load)
            const recentlyOpened = await this.workspacesService.getRecentlyOpened()
                .catch(() => ({ files: [], workspaces: [] })).then(w => w.workspaces);
            clearNode(voidIconBox);
            clearNode(recentsBox);
            this.currentDisposables.forEach(label => label.dispose());
            this.currentDisposables.clear();
            // Void - if the workbench is empty, show open
            if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                // Create a flex container for buttons with vertical direction
                const buttonContainer = $('div');
                buttonContainer.style.display = 'flex';
                buttonContainer.style.flexDirection = 'column'; // Change to column for vertical stacking
                buttonContainer.style.alignItems = 'center'; // Center the buttons horizontally
                buttonContainer.style.gap = '8px'; // Reduce gap between buttons from 16px to 8px
                buttonContainer.style.marginBottom = '16px';
                voidIconBox.appendChild(buttonContainer);
                // Open a folder
                const openFolderButton = h('button');
                openFolderButton.root.classList.add('void-openfolder-button');
                openFolderButton.root.style.display = 'block';
                openFolderButton.root.style.width = '124px'; // Set width to 124px as requested
                openFolderButton.root.textContent = 'Open Folder';
                openFolderButton.root.onclick = () => {
                    this.commandService.executeCommand(isMacintosh && isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID);
                    // if (this.contextKeyService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    // 	this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                    // } else {
                    // 	this.commandService.executeCommand(isMacintosh ? 'workbench.action.files.openFileFolder' : 'workbench.action.files.openFolder');
                    // }
                };
                buttonContainer.appendChild(openFolderButton.root);
                // Open SSH button
                const openSSHButton = h('button');
                openSSHButton.root.classList.add('void-openssh-button');
                openSSHButton.root.style.display = 'block';
                openSSHButton.root.style.backgroundColor = '#5a5a5a'; // Made darker than the default gray
                openSSHButton.root.style.width = '124px'; // Set width to 124px as requested
                openSSHButton.root.textContent = 'Open SSH';
                openSSHButton.root.onclick = () => {
                    this.viewsService.openViewContainer(REMOTE_EXPLORER_VIEWLET_ID);
                };
                buttonContainer.appendChild(openSSHButton.root);
                // Recents
                if (recentlyOpened.length !== 0) {
                    voidIconBox.append(...recentlyOpened.map((w, i) => {
                        let fullPath;
                        let windowOpenable;
                        if (isRecentFolder(w)) {
                            windowOpenable = { folderUri: w.folderUri };
                            fullPath = w.label || this.labelService.getWorkspaceLabel(w.folderUri, { verbose: 2 /* Verbosity.LONG */ });
                        }
                        else {
                            return null;
                            // fullPath = w.label || this.labelService.getWorkspaceLabel(w.workspace, { verbose: Verbosity.LONG });
                            // windowOpenable = { workspaceUri: w.workspace.configPath };
                        }
                        const { name, parentPath } = splitRecentLabel(fullPath);
                        const linkSpan = $('span');
                        linkSpan.classList.add('void-link');
                        linkSpan.style.display = 'flex';
                        linkSpan.style.gap = '4px';
                        linkSpan.style.padding = '8px';
                        linkSpan.addEventListener('click', e => {
                            this.hostService.openWindow([windowOpenable], {
                                forceNewWindow: e.ctrlKey || e.metaKey,
                                remoteAuthority: w.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                            });
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        const nameSpan = $('span');
                        nameSpan.innerText = name;
                        nameSpan.title = fullPath;
                        linkSpan.appendChild(nameSpan);
                        const dirSpan = $('span');
                        dirSpan.style.paddingLeft = '4px';
                        dirSpan.style.whiteSpace = 'nowrap';
                        dirSpan.style.overflow = 'hidden';
                        dirSpan.style.maxWidth = '300px';
                        dirSpan.innerText = parentPath;
                        dirSpan.title = fullPath;
                        linkSpan.appendChild(dirSpan);
                        return linkSpan;
                    })
                        .filter(v => !!v)
                        .slice(0, 5) // take 5 most recent
                    );
                }
            }
            else {
                // show them Void keybindings
                const keys = this.keybindingService.lookupKeybinding(VOID_CTRL_L_ACTION_ID);
                const dl = append(voidIconBox, $('dl'));
                const dt = append(dl, $('dt'));
                dt.textContent = 'Chat';
                const dd = append(dl, $('dd'));
                const label = new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles });
                if (keys)
                    label.set(keys);
                this.currentDisposables.add(label);
                const keys2 = this.keybindingService.lookupKeybinding(VOID_CTRL_K_ACTION_ID);
                const dl2 = append(voidIconBox, $('dl'));
                const dt2 = append(dl2, $('dt'));
                dt2.textContent = 'Quick Edit';
                const dd2 = append(dl2, $('dd'));
                const label2 = new KeybindingLabel(dd2, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles });
                if (keys2)
                    label2.set(keys2);
                this.currentDisposables.add(label2);
                // const keys3 = this.keybindingService.lookupKeybinding('workbench.action.openGlobalKeybindings');
                // const button3 = append(recentsBox, $('button'));
                // button3.textContent = `Void Settings`
                // button3.style.display = 'block'
                // button3.style.marginLeft = 'auto'
                // button3.style.marginRight = 'auto'
                // button3.classList.add('void-settings-watermark-button')
                // const label3 = new KeybindingLabel(button3, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles });
                // if (keys3)
                // 	label3.set(keys3);
                // button3.onclick = () => {
                // 	this.commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID)
                // }
                // this.currentDisposables.add(label3);
            }
        };
        update();
        this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
    }
    clear() {
        clearNode(this.shortcuts);
        this.transientDisposables.clear();
    }
    dispose() {
        super.dispose();
        this.clear();
        this.currentDisposables.forEach(label => label.dispose());
    }
};
EditorGroupWatermark = __decorate([
    __param(1, IKeybindingService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IThemeService),
    __param(5, IWorkspacesService),
    __param(6, ICommandService),
    __param(7, IHostService),
    __param(8, ILabelService),
    __param(9, IViewsService)
], EditorGroupWatermark);
export { EditorGroupWatermark };
registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/
// import { $, append, clearNode, h } from '../../../../base/browser/dom.js';
// import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
// import { coalesce, shuffle } from '../../../../base/common/arrays.js';
// import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
// import { isMacintosh, isWeb, OS } from '../../../../base/common/platform.js';
// import { localize } from '../../../../nls.js';
// import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
// import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
// import { ContextKeyExpr, ContextKeyExpression, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
// import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
// import { IStorageService, StorageScope, StorageTarget, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
// import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
// import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
// import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';
// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }
// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };
// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);
// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];
// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];
// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// ];
// export class EditorGroupWatermark extends Disposable {
// 	private static readonly CACHED_WHEN = 'editorGroupWatermark.whenConditions';
// 	private readonly cachedWhen: { [when: string]: boolean };
// 	private readonly shortcuts: HTMLElement;
// 	private readonly transientDisposables = this._register(new DisposableStore());
// 	private readonly keybindingLabels = this._register(new DisposableStore());
// 	private enabled = false;
// 	private workbenchState: WorkbenchState;
// 	constructor(
// 		container: HTMLElement,
// 		@IKeybindingService private readonly keybindingService: IKeybindingService,
// 		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
// 		@IContextKeyService private readonly contextKeyService: IContextKeyService,
// 		@IConfigurationService private readonly configurationService: IConfigurationService,
// 		@IStorageService private readonly storageService: IStorageService
// 	) {
// 		super();
// 		this.cachedWhen = this.storageService.getObject(EditorGroupWatermark.CACHED_WHEN, StorageScope.PROFILE, Object.create(null));
// 		this.workbenchState = this.contextService.getWorkbenchState();
// 		const elements = h('.editor-group-watermark', [
// 			h('.letterpress'),
// 			h('.shortcuts@shortcuts'),
// 		]);
// 		append(container, elements.root);
// 		this.shortcuts = elements.shortcuts;
// 		this.registerListeners();
// 		this.render();
// 	}
// 	private registerListeners(): void {
// 		this._register(this.configurationService.onDidChangeConfiguration(e => {
// 			if (e.affectsConfiguration('workbench.tips.enabled') && this.enabled !== this.configurationService.getValue<boolean>('workbench.tips.enabled')) {
// 				this.render();
// 			}
// 		}));
// 		this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
// 			if (this.workbenchState !== workbenchState) {
// 				this.workbenchState = workbenchState;
// 				this.render();
// 			}
// 		}));
// 		this._register(this.storageService.onWillSaveState(e => {
// 			if (e.reason === WillSaveStateReason.SHUTDOWN) {
// 				const entries = [...emptyWindowEntries, ...randomEmptyWindowEntries, ...workspaceEntries, ...randomWorkspaceEntries];
// 				for (const entry of entries) {
// 					const when = isWeb ? entry.when?.web : entry.when?.native;
// 					if (when) {
// 						this.cachedWhen[entry.id] = this.contextKeyService.contextMatchesRules(when);
// 					}
// 				}
// 				this.storageService.store(EditorGroupWatermark.CACHED_WHEN, JSON.stringify(this.cachedWhen), StorageScope.PROFILE, StorageTarget.MACHINE);
// 			}
// 		}));
// 	}
// 	private render(): void {
// 		this.enabled = this.configurationService.getValue<boolean>('workbench.tips.enabled');
// 		clearNode(this.shortcuts);
// 		this.transientDisposables.clear();
// 		if (!this.enabled) {
// 			return;
// 		}
// 		const fixedEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? workspaceEntries : emptyWindowEntries, false /* not shuffled */);
// 		const randomEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? randomWorkspaceEntries : randomEmptyWindowEntries, true /* shuffled */).slice(0, Math.max(0, 5 - fixedEntries.length));
// 		const entries = [...fixedEntries, ...randomEntries];
// 		const box = append(this.shortcuts, $('.watermark-box'));
// 		const update = () => {
// 			clearNode(box);
// 			this.keybindingLabels.clear();
// 			for (const entry of entries) {
// 				const keys = this.keybindingService.lookupKeybinding(entry.id);
// 				if (!keys) {
// 					continue;
// 				}
// 				const dl = append(box, $('dl'));
// 				const dt = append(dl, $('dt'));
// 				dt.textContent = entry.text;
// 				const dd = append(dl, $('dd'));
// 				const label = this.keybindingLabels.add(new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles }));
// 				label.set(keys);
// 			}
// 		};
// 		update();
// 		this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
// 	}
// 	private filterEntries(entries: WatermarkEntry[], shuffleEntries: boolean): WatermarkEntry[] {
// 		const filteredEntries = entries
// 			.filter(entry => (isWeb && !entry.when?.web) || (!isWeb && !entry.when?.native) || this.cachedWhen[entry.id])
// 			.filter(entry => !!CommandsRegistry.getCommand(entry.id))
// 			.filter(entry => !!this.keybindingService.lookupKeybinding(entry.id));
// 		if (shuffleEntries) {
// 			shuffle(filteredEntries);
// 		}
// 		return filteredEntries;
// 	}
// }
// registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yR3JvdXBXYXRlcm1hcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0Qs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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckdyb3VwV2F0ZXJtYXJrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxvREFBb0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNE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
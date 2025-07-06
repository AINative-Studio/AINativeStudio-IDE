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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JHcm91cFdhdGVybWFyay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNsSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNE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
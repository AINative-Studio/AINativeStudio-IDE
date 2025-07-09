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
import { groupBy } from '../../../../../base/common/arrays.js';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { uppercaseFirstLetter } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { JUPYTER_EXTENSION_ID, KERNEL_RECOMMENDATIONS } from '../notebookBrowser.js';
import { executingStateIcon, selectKernelIcon } from '../notebookIcons.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../../common/notebookKernelService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { URI } from '../../../../../base/common/uri.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { IExtensionManagementServerService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
function isKernelPick(item) {
    return 'kernel' in item;
}
function isGroupedKernelsPick(item) {
    return 'kernels' in item;
}
function isSourcePick(item) {
    return 'action' in item;
}
function isInstallExtensionPick(item) {
    return item.id === 'installSuggested' && 'extensionIds' in item;
}
function isSearchMarketplacePick(item) {
    return item.id === 'install';
}
function isKernelSourceQuickPickItem(item) {
    return 'command' in item;
}
function supportAutoRun(item) {
    return 'autoRun' in item && !!item.autoRun;
}
const KERNEL_PICKER_UPDATE_DEBOUNCE = 200;
function toKernelQuickPick(kernel, selected) {
    const res = {
        kernel,
        picked: kernel.id === selected?.id,
        label: kernel.label,
        description: kernel.description,
        detail: kernel.detail
    };
    if (kernel.id === selected?.id) {
        if (!res.description) {
            res.description = localize('current1', "Currently Selected");
        }
        else {
            res.description = localize('current2', "{0} - Currently Selected", res.description);
        }
    }
    return res;
}
class KernelPickerStrategyBase {
    constructor(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _commandService, _extensionManagementServerService) {
        this._notebookKernelService = _notebookKernelService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._labelService = _labelService;
        this._logService = _logService;
        this._extensionWorkbenchService = _extensionWorkbenchService;
        this._extensionService = _extensionService;
        this._commandService = _commandService;
        this._extensionManagementServerService = _extensionManagementServerService;
    }
    async showQuickPick(editor, wantedId, skipAutoRun) {
        const notebook = editor.textModel;
        const scopedContextKeyService = editor.scopedContextKeyService;
        const matchResult = this._getMatchingResult(notebook);
        const { selected, all } = matchResult;
        let newKernel;
        if (wantedId) {
            for (const candidate of all) {
                if (candidate.id === wantedId) {
                    newKernel = candidate;
                    break;
                }
            }
            if (!newKernel) {
                this._logService.warn(`wanted kernel DOES NOT EXIST, wanted: ${wantedId}, all: ${all.map(k => k.id)}`);
                return false;
            }
        }
        if (newKernel) {
            this._selecteKernel(notebook, newKernel);
            return true;
        }
        const localDisposableStore = new DisposableStore();
        const quickPick = localDisposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        const quickPickItems = this._getKernelPickerQuickPickItems(notebook, matchResult, this._notebookKernelService, scopedContextKeyService);
        if (quickPickItems.length === 1 && supportAutoRun(quickPickItems[0]) && !skipAutoRun) {
            const picked = await this._handleQuickPick(editor, quickPickItems[0], quickPickItems);
            localDisposableStore.dispose();
            return picked;
        }
        quickPick.items = quickPickItems;
        quickPick.canSelectMany = false;
        quickPick.placeholder = selected
            ? localize('prompt.placeholder.change', "Change kernel for '{0}'", this._labelService.getUriLabel(notebook.uri, { relative: true }))
            : localize('prompt.placeholder.select', "Select kernel for '{0}'", this._labelService.getUriLabel(notebook.uri, { relative: true }));
        quickPick.busy = this._notebookKernelService.getKernelDetectionTasks(notebook).length > 0;
        const kernelDetectionTaskListener = this._notebookKernelService.onDidChangeKernelDetectionTasks(() => {
            quickPick.busy = this._notebookKernelService.getKernelDetectionTasks(notebook).length > 0;
        });
        // run extension recommendataion task if quickPickItems is empty
        const extensionRecommendataionPromise = quickPickItems.length === 0
            ? createCancelablePromise(token => this._showInstallKernelExtensionRecommendation(notebook, quickPick, this._extensionWorkbenchService, token))
            : undefined;
        const kernelChangeEventListener = Event.debounce(Event.any(this._notebookKernelService.onDidChangeSourceActions, this._notebookKernelService.onDidAddKernel, this._notebookKernelService.onDidRemoveKernel, this._notebookKernelService.onDidChangeNotebookAffinity), (last, _current) => last, KERNEL_PICKER_UPDATE_DEBOUNCE)(async () => {
            // reset quick pick progress
            quickPick.busy = false;
            extensionRecommendataionPromise?.cancel();
            const currentActiveItems = quickPick.activeItems;
            const matchResult = this._getMatchingResult(notebook);
            const quickPickItems = this._getKernelPickerQuickPickItems(notebook, matchResult, this._notebookKernelService, scopedContextKeyService);
            quickPick.keepScrollPosition = true;
            // recalcuate active items
            const activeItems = [];
            for (const item of currentActiveItems) {
                if (isKernelPick(item)) {
                    const kernelId = item.kernel.id;
                    const sameItem = quickPickItems.find(pi => isKernelPick(pi) && pi.kernel.id === kernelId);
                    if (sameItem) {
                        activeItems.push(sameItem);
                    }
                }
                else if (isSourcePick(item)) {
                    const sameItem = quickPickItems.find(pi => isSourcePick(pi) && pi.action.action.id === item.action.action.id);
                    if (sameItem) {
                        activeItems.push(sameItem);
                    }
                }
            }
            quickPick.items = quickPickItems;
            quickPick.activeItems = activeItems;
        }, this);
        const pick = await new Promise((resolve, reject) => {
            localDisposableStore.add(quickPick.onDidAccept(() => {
                const item = quickPick.selectedItems[0];
                if (item) {
                    resolve({ selected: item, items: quickPick.items });
                }
                else {
                    resolve({ selected: undefined, items: quickPick.items });
                }
                quickPick.hide();
            }));
            localDisposableStore.add(quickPick.onDidHide(() => {
                kernelDetectionTaskListener.dispose();
                kernelChangeEventListener.dispose();
                quickPick.dispose();
                resolve({ selected: undefined, items: quickPick.items });
            }));
            quickPick.show();
        });
        localDisposableStore.dispose();
        if (pick.selected) {
            return await this._handleQuickPick(editor, pick.selected, pick.items);
        }
        return false;
    }
    _getMatchingResult(notebook) {
        return this._notebookKernelService.getMatchingKernel(notebook);
    }
    async _handleQuickPick(editor, pick, quickPickItems) {
        if (isKernelPick(pick)) {
            const newKernel = pick.kernel;
            this._selecteKernel(editor.textModel, newKernel);
            return true;
        }
        // actions
        if (isSearchMarketplacePick(pick)) {
            await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, []);
            // suggestedExtension must be defined for this option to be shown, but still check to make TS happy
        }
        else if (isInstallExtensionPick(pick)) {
            await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, pick.extensionIds, this._productService.quality !== 'stable');
        }
        else if (isSourcePick(pick)) {
            // selected explicilty, it should trigger the execution?
            pick.action.runAction();
        }
        return true;
    }
    _selecteKernel(notebook, kernel) {
        this._notebookKernelService.selectKernelForNotebook(kernel, notebook);
    }
    async _showKernelExtension(extensionWorkbenchService, extensionService, extensionManagementServerService, viewType, extIds, isInsiders) {
        // If extension id is provided attempt to install the extension as the user has requested the suggested ones be installed
        const extensionsToInstall = [];
        const extensionsToInstallOnRemote = [];
        const extensionsToEnable = [];
        for (const extId of extIds) {
            const extension = (await extensionWorkbenchService.getExtensions([{ id: extId }], CancellationToken.None))[0];
            if (extension.enablementState === 9 /* EnablementState.DisabledGlobally */ || extension.enablementState === 10 /* EnablementState.DisabledWorkspace */ || extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */) {
                extensionsToEnable.push(extension);
            }
            else if (!extensionWorkbenchService.installed.some(e => areSameExtensions(e.identifier, extension.identifier))) {
                // Install this extension only if it hasn't already been installed.
                const canInstall = await extensionWorkbenchService.canInstall(extension);
                if (canInstall === true) {
                    extensionsToInstall.push(extension);
                }
            }
            else if (extensionManagementServerService.remoteExtensionManagementServer) {
                // already installed, check if it should be installed on remote since we are not getting any kernels or kernel providers.
                if (extensionWorkbenchService.installed.some(e => areSameExtensions(e.identifier, extension.identifier) && e.server === extensionManagementServerService.remoteExtensionManagementServer)) {
                    // extension exists on remote server. should not happen
                    continue;
                }
                else {
                    // extension doesn't exist on remote server
                    const canInstall = await extensionWorkbenchService.canInstall(extension);
                    if (canInstall) {
                        extensionsToInstallOnRemote.push(extension);
                    }
                }
            }
        }
        if (extensionsToInstall.length || extensionsToEnable.length || extensionsToInstallOnRemote.length) {
            await Promise.all([...extensionsToInstall.map(async (extension) => {
                    await extensionWorkbenchService.install(extension, {
                        installPreReleaseVersion: isInsiders ?? false,
                        context: { skipWalkthrough: true },
                    }, 15 /* ProgressLocation.Notification */);
                }), ...extensionsToEnable.map(async (extension) => {
                    switch (extension.enablementState) {
                        case 10 /* EnablementState.DisabledWorkspace */:
                            await extensionWorkbenchService.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
                            return;
                        case 9 /* EnablementState.DisabledGlobally */:
                            await extensionWorkbenchService.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
                            return;
                        case 2 /* EnablementState.DisabledByEnvironment */:
                            await extensionWorkbenchService.setEnablement([extension], 3 /* EnablementState.EnabledByEnvironment */);
                            return;
                        default:
                            break;
                    }
                }), ...extensionsToInstallOnRemote.map(async (extension) => {
                    await extensionWorkbenchService.installInServer(extension, this._extensionManagementServerService.remoteExtensionManagementServer);
                })]);
            await extensionService.activateByEvent(`onNotebook:${viewType}`);
            return;
        }
        const pascalCased = viewType.split(/[^a-z0-9]/ig).map(uppercaseFirstLetter).join('');
        await extensionWorkbenchService.openSearch(`@tag:notebookKernel${pascalCased}`);
    }
    async _showInstallKernelExtensionRecommendation(notebookTextModel, quickPick, extensionWorkbenchService, token) {
        quickPick.busy = true;
        const newQuickPickItems = await this._getKernelRecommendationsQuickPickItems(notebookTextModel, extensionWorkbenchService);
        quickPick.busy = false;
        if (token.isCancellationRequested) {
            return;
        }
        if (newQuickPickItems && quickPick.items.length === 0) {
            quickPick.items = newQuickPickItems;
        }
    }
    async _getKernelRecommendationsQuickPickItems(notebookTextModel, extensionWorkbenchService) {
        const quickPickItems = [];
        const language = this.getSuggestedLanguage(notebookTextModel);
        const suggestedExtension = language ? this.getSuggestedKernelFromLanguage(notebookTextModel.viewType, language) : undefined;
        if (suggestedExtension) {
            await extensionWorkbenchService.queryLocal();
            const extensions = extensionWorkbenchService.installed.filter(e => (e.enablementState === 3 /* EnablementState.EnabledByEnvironment */ || e.enablementState === 11 /* EnablementState.EnabledGlobally */ || e.enablementState === 12 /* EnablementState.EnabledWorkspace */)
                && suggestedExtension.extensionIds.includes(e.identifier.id));
            if (extensions.length === suggestedExtension.extensionIds.length) {
                // it's installed but might be detecting kernels
                return undefined;
            }
            // We have a suggested kernel, show an option to install it
            quickPickItems.push({
                id: 'installSuggested',
                description: suggestedExtension.displayName ?? suggestedExtension.extensionIds.join(', '),
                label: `$(${Codicon.lightbulb.id}) ` + localize('installSuggestedKernel', 'Install/Enable suggested extensions'),
                extensionIds: suggestedExtension.extensionIds
            });
        }
        // there is no kernel, show the install from marketplace
        quickPickItems.push({
            id: 'install',
            label: localize('searchForKernels', "Browse marketplace for kernel extensions"),
        });
        return quickPickItems;
    }
    /**
     * Examine the most common language in the notebook
     * @param notebookTextModel The notebook text model
     * @returns What the suggested language is for the notebook. Used for kernal installing
     */
    getSuggestedLanguage(notebookTextModel) {
        const metaData = notebookTextModel.metadata;
        let suggestedKernelLanguage = metaData?.metadata?.language_info?.name;
        // TODO how do we suggest multi language notebooks?
        if (!suggestedKernelLanguage) {
            const cellLanguages = notebookTextModel.cells.map(cell => cell.language).filter(language => language !== 'markdown');
            // Check if cell languages is all the same
            if (cellLanguages.length > 1) {
                const firstLanguage = cellLanguages[0];
                if (cellLanguages.every(language => language === firstLanguage)) {
                    suggestedKernelLanguage = firstLanguage;
                }
            }
        }
        return suggestedKernelLanguage;
    }
    /**
     * Given a language and notebook view type suggest a kernel for installation
     * @param language The language to find a suggested kernel extension for
     * @returns A recommednation object for the recommended extension, else undefined
     */
    getSuggestedKernelFromLanguage(viewType, language) {
        const recommendation = KERNEL_RECOMMENDATIONS.get(viewType)?.get(language);
        return recommendation;
    }
}
let KernelPickerMRUStrategy = class KernelPickerMRUStrategy extends KernelPickerStrategyBase {
    constructor(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _extensionManagementServerService, _commandService, _notebookKernelHistoryService, _openerService) {
        super(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _commandService, _extensionManagementServerService);
        this._notebookKernelHistoryService = _notebookKernelHistoryService;
        this._openerService = _openerService;
    }
    _getKernelPickerQuickPickItems(notebookTextModel, matchResult, notebookKernelService, scopedContextKeyService) {
        const quickPickItems = [];
        if (matchResult.selected) {
            const kernelItem = toKernelQuickPick(matchResult.selected, matchResult.selected);
            quickPickItems.push(kernelItem);
        }
        matchResult.suggestions.filter(kernel => kernel.id !== matchResult.selected?.id).map(kernel => toKernelQuickPick(kernel, matchResult.selected))
            .forEach(kernel => {
            quickPickItems.push(kernel);
        });
        const shouldAutoRun = quickPickItems.length === 0;
        if (quickPickItems.length > 0) {
            quickPickItems.push({
                type: 'separator'
            });
        }
        // select another kernel quick pick
        quickPickItems.push({
            id: 'selectAnother',
            label: localize('selectAnotherKernel.more', "Select Another Kernel..."),
            autoRun: shouldAutoRun
        });
        return quickPickItems;
    }
    _selecteKernel(notebook, kernel) {
        const currentInfo = this._notebookKernelService.getMatchingKernel(notebook);
        if (currentInfo.selected) {
            // there is already a selected kernel
            this._notebookKernelHistoryService.addMostRecentKernel(currentInfo.selected);
        }
        super._selecteKernel(notebook, kernel);
        this._notebookKernelHistoryService.addMostRecentKernel(kernel);
    }
    _getMatchingResult(notebook) {
        const { selected, all } = this._notebookKernelHistoryService.getKernels(notebook);
        const matchingResult = this._notebookKernelService.getMatchingKernel(notebook);
        return {
            selected: selected,
            all: matchingResult.all,
            suggestions: all,
            hidden: []
        };
    }
    async _handleQuickPick(editor, pick, items) {
        if (pick.id === 'selectAnother') {
            return this.displaySelectAnotherQuickPick(editor, items.length === 1 && items[0] === pick);
        }
        return super._handleQuickPick(editor, pick, items);
    }
    async displaySelectAnotherQuickPick(editor, kernelListEmpty) {
        const notebook = editor.textModel;
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        const quickPickItem = await new Promise(resolve => {
            // select from kernel sources
            quickPick.title = kernelListEmpty ? localize('select', "Select Kernel") : localize('selectAnotherKernel', "Select Another Kernel");
            quickPick.placeholder = localize('selectKernel.placeholder', "Type to choose a kernel source");
            quickPick.busy = true;
            quickPick.buttons = [this._quickInputService.backButton];
            quickPick.show();
            disposables.add(quickPick.onDidTriggerButton(button => {
                if (button === this._quickInputService.backButton) {
                    resolve(button);
                }
            }));
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                if (isKernelSourceQuickPickItem(e.item) && e.item.documentation !== undefined) {
                    const uri = URI.isUri(e.item.documentation) ? URI.parse(e.item.documentation) : await this._commandService.executeCommand(e.item.documentation);
                    void this._openerService.open(uri, { openExternal: true });
                }
            }));
            disposables.add(quickPick.onDidAccept(async () => {
                resolve(quickPick.selectedItems[0]);
            }));
            disposables.add(quickPick.onDidHide(() => {
                resolve(undefined);
            }));
            this._calculdateKernelSources(editor).then(quickPickItems => {
                quickPick.items = quickPickItems;
                if (quickPick.items.length > 0) {
                    quickPick.busy = false;
                }
            });
            disposables.add(Event.debounce(Event.any(this._notebookKernelService.onDidChangeSourceActions, this._notebookKernelService.onDidAddKernel, this._notebookKernelService.onDidRemoveKernel), (last, _current) => last, KERNEL_PICKER_UPDATE_DEBOUNCE)(async () => {
                quickPick.busy = true;
                const quickPickItems = await this._calculdateKernelSources(editor);
                quickPick.items = quickPickItems;
                quickPick.busy = false;
            }));
        });
        quickPick.hide();
        disposables.dispose();
        if (quickPickItem === this._quickInputService.backButton) {
            return this.showQuickPick(editor, undefined, true);
        }
        if (quickPickItem) {
            const selectedKernelPickItem = quickPickItem;
            if (isKernelSourceQuickPickItem(selectedKernelPickItem)) {
                try {
                    const selectedKernelId = await this._executeCommand(notebook, selectedKernelPickItem.command);
                    if (selectedKernelId) {
                        const { all } = await this._getMatchingResult(notebook);
                        const kernel = all.find(kernel => kernel.id === `ms-toolsai.jupyter/${selectedKernelId}`);
                        if (kernel) {
                            await this._selecteKernel(notebook, kernel);
                            return true;
                        }
                        return true;
                    }
                    else {
                        return this.displaySelectAnotherQuickPick(editor, false);
                    }
                }
                catch (ex) {
                    return false;
                }
            }
            else if (isKernelPick(selectedKernelPickItem)) {
                await this._selecteKernel(notebook, selectedKernelPickItem.kernel);
                return true;
            }
            else if (isGroupedKernelsPick(selectedKernelPickItem)) {
                await this._selectOneKernel(notebook, selectedKernelPickItem.label, selectedKernelPickItem.kernels);
                return true;
            }
            else if (isSourcePick(selectedKernelPickItem)) {
                // selected explicilty, it should trigger the execution?
                try {
                    await selectedKernelPickItem.action.runAction();
                    return true;
                }
                catch (ex) {
                    return false;
                }
            }
            else if (isSearchMarketplacePick(selectedKernelPickItem)) {
                await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, []);
                return true;
            }
            else if (isInstallExtensionPick(selectedKernelPickItem)) {
                await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, selectedKernelPickItem.extensionIds, this._productService.quality !== 'stable');
                return this.displaySelectAnotherQuickPick(editor, false);
            }
        }
        return false;
    }
    async _calculdateKernelSources(editor) {
        const notebook = editor.textModel;
        const sourceActionCommands = this._notebookKernelService.getSourceActions(notebook, editor.scopedContextKeyService);
        const actions = await this._notebookKernelService.getKernelSourceActions2(notebook);
        const matchResult = this._getMatchingResult(notebook);
        if (sourceActionCommands.length === 0 && matchResult.all.length === 0 && actions.length === 0) {
            return await this._getKernelRecommendationsQuickPickItems(notebook, this._extensionWorkbenchService) ?? [];
        }
        const others = matchResult.all.filter(item => item.extension.value !== JUPYTER_EXTENSION_ID);
        const quickPickItems = [];
        // group controllers by extension
        for (const group of groupBy(others, (a, b) => a.extension.value === b.extension.value ? 0 : 1)) {
            const extension = this._extensionService.extensions.find(extension => extension.identifier.value === group[0].extension.value);
            const source = extension?.displayName ?? extension?.description ?? group[0].extension.value;
            if (group.length > 1) {
                quickPickItems.push({
                    label: source,
                    kernels: group
                });
            }
            else {
                quickPickItems.push({
                    label: group[0].label,
                    kernel: group[0]
                });
            }
        }
        const validActions = actions.filter(action => action.command);
        quickPickItems.push(...validActions.map(action => {
            const buttons = action.documentation ? [{
                    iconClass: ThemeIcon.asClassName(Codicon.info),
                    tooltip: localize('learnMoreTooltip', 'Learn More'),
                }] : [];
            return {
                id: typeof action.command === 'string' ? action.command : action.command.id,
                label: action.label,
                description: action.description,
                command: action.command,
                documentation: action.documentation,
                buttons
            };
        }));
        for (const sourceAction of sourceActionCommands) {
            const res = {
                action: sourceAction,
                picked: false,
                label: sourceAction.action.label,
                tooltip: sourceAction.action.tooltip
            };
            quickPickItems.push(res);
        }
        return quickPickItems;
    }
    async _selectOneKernel(notebook, source, kernels) {
        const quickPickItems = kernels.map(kernel => toKernelQuickPick(kernel, undefined));
        const localDisposableStore = new DisposableStore();
        const quickPick = localDisposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.items = quickPickItems;
        quickPick.canSelectMany = false;
        quickPick.title = localize('selectKernelFromExtension', "Select Kernel from {0}", source);
        localDisposableStore.add(quickPick.onDidAccept(async () => {
            if (quickPick.selectedItems && quickPick.selectedItems.length > 0 && isKernelPick(quickPick.selectedItems[0])) {
                await this._selecteKernel(notebook, quickPick.selectedItems[0].kernel);
            }
            quickPick.hide();
            quickPick.dispose();
        }));
        localDisposableStore.add(quickPick.onDidHide(() => {
            localDisposableStore.dispose();
        }));
        quickPick.show();
    }
    async _executeCommand(notebook, command) {
        const id = typeof command === 'string' ? command : command.id;
        const args = typeof command === 'string' ? [] : command.arguments ?? [];
        if (typeof command === 'string' || !command.arguments || !Array.isArray(command.arguments) || command.arguments.length === 0) {
            args.unshift({
                uri: notebook.uri,
                $mid: 14 /* MarshalledId.NotebookActionContext */
            });
        }
        if (typeof command === 'string') {
            return this._commandService.executeCommand(id);
        }
        else {
            return this._commandService.executeCommand(id, ...args);
        }
    }
    static updateKernelStatusAction(notebook, action, notebookKernelService, notebookKernelHistoryService) {
        const detectionTasks = notebookKernelService.getKernelDetectionTasks(notebook);
        if (detectionTasks.length) {
            const info = notebookKernelService.getMatchingKernel(notebook);
            action.enabled = true;
            action.class = ThemeIcon.asClassName(ThemeIcon.modify(executingStateIcon, 'spin'));
            if (info.selected) {
                action.label = info.selected.label;
                const kernelInfo = info.selected.description ?? info.selected.detail;
                action.tooltip = kernelInfo
                    ? localize('kernels.selectedKernelAndKernelDetectionRunning', "Selected Kernel: {0} (Kernel Detection Tasks Running)", kernelInfo)
                    : localize('kernels.detecting', "Detecting Kernels");
            }
            else {
                action.label = localize('kernels.detecting', "Detecting Kernels");
            }
            return;
        }
        const runningActions = notebookKernelService.getRunningSourceActions(notebook);
        const updateActionFromSourceAction = (sourceAction, running) => {
            const sAction = sourceAction.action;
            action.class = running ? ThemeIcon.asClassName(ThemeIcon.modify(executingStateIcon, 'spin')) : ThemeIcon.asClassName(selectKernelIcon);
            action.label = sAction.label;
            action.enabled = true;
        };
        if (runningActions.length) {
            return updateActionFromSourceAction(runningActions[0] /** TODO handle multiple actions state */, true);
        }
        const { selected } = notebookKernelHistoryService.getKernels(notebook);
        if (selected) {
            action.label = selected.label;
            action.class = ThemeIcon.asClassName(selectKernelIcon);
            action.tooltip = selected.description ?? selected.detail ?? '';
        }
        else {
            action.label = localize('select', "Select Kernel");
            action.class = ThemeIcon.asClassName(selectKernelIcon);
            action.tooltip = '';
        }
    }
    static async resolveKernel(notebook, notebookKernelService, notebookKernelHistoryService, commandService) {
        const alreadySelected = notebookKernelHistoryService.getKernels(notebook);
        if (alreadySelected.selected) {
            return alreadySelected.selected;
        }
        await commandService.executeCommand(SELECT_KERNEL_ID);
        const { selected } = notebookKernelHistoryService.getKernels(notebook);
        return selected;
    }
};
KernelPickerMRUStrategy = __decorate([
    __param(0, INotebookKernelService),
    __param(1, IProductService),
    __param(2, IQuickInputService),
    __param(3, ILabelService),
    __param(4, ILogService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionService),
    __param(7, IExtensionManagementServerService),
    __param(8, ICommandService),
    __param(9, INotebookKernelHistoryService),
    __param(10, IOpenerService)
], KernelPickerMRUStrategy);
export { KernelPickerMRUStrategy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxRdWlja1BpY2tTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0tlcm5lbFF1aWNrUGlja1N0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTNGLE9BQU8sRUFBcUIsa0JBQWtCLEVBQThDLE1BQU0seURBQXlELENBQUM7QUFDNUosT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9B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
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
import { Barrier } from '../../../base/common/async.js';
import { isUriComponents, URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { observableValue, observableValueOpts, transaction } from '../../../base/common/observable.js';
import { DisposableStore, combinedDisposable, dispose, Disposable } from '../../../base/common/lifecycle.js';
import { ISCMService, ISCMViewService } from '../../contrib/scm/common/scm.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IQuickDiffService } from '../../contrib/scm/common/quickDiff.js';
import { ResourceTree } from '../../../base/common/resourceTree.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { basename } from '../../../base/common/resources.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { Schemas } from '../../../base/common/network.js';
import { structuralEquals } from '../../../base/common/equals.js';
import { historyItemBaseRefColor, historyItemRefColor, historyItemRemoteRefColor } from '../../contrib/scm/browser/scmHistory.js';
function getIconFromIconDto(iconDto) {
    if (iconDto === undefined) {
        return undefined;
    }
    else if (ThemeIcon.isThemeIcon(iconDto)) {
        return iconDto;
    }
    else if (isUriComponents(iconDto)) {
        return URI.revive(iconDto);
    }
    else {
        const icon = iconDto;
        return { light: URI.revive(icon.light), dark: URI.revive(icon.dark) };
    }
}
function toISCMHistoryItem(historyItemDto) {
    const authorIcon = getIconFromIconDto(historyItemDto.authorIcon);
    const references = historyItemDto.references?.map(r => ({
        ...r, icon: getIconFromIconDto(r.icon)
    }));
    return { ...historyItemDto, authorIcon, references };
}
function toISCMHistoryItemRef(historyItemRefDto, color) {
    return historyItemRefDto ? { ...historyItemRefDto, icon: getIconFromIconDto(historyItemRefDto.icon), color: color } : undefined;
}
class SCMInputBoxContentProvider extends Disposable {
    constructor(textModelService, modelService, languageService) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.vscodeSourceControl, this));
    }
    async provideTextContent(resource) {
        const existing = this.modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        return this.modelService.createModel('', this.languageService.createById('scminput'), resource);
    }
}
class MainThreadSCMResourceGroup {
    get resourceTree() {
        if (!this._resourceTree) {
            const rootUri = this.provider.rootUri ?? URI.file('/');
            this._resourceTree = new ResourceTree(this, rootUri, this._uriIdentService.extUri);
            for (const resource of this.resources) {
                this._resourceTree.add(resource.sourceUri, resource);
            }
        }
        return this._resourceTree;
    }
    get hideWhenEmpty() { return !!this.features.hideWhenEmpty; }
    get contextValue() { return this.features.contextValue; }
    constructor(sourceControlHandle, handle, provider, features, label, id, multiDiffEditorEnableViewChanges, _uriIdentService) {
        this.sourceControlHandle = sourceControlHandle;
        this.handle = handle;
        this.provider = provider;
        this.features = features;
        this.label = label;
        this.id = id;
        this.multiDiffEditorEnableViewChanges = multiDiffEditorEnableViewChanges;
        this._uriIdentService = _uriIdentService;
        this.resources = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeResources = new Emitter();
        this.onDidChangeResources = this._onDidChangeResources.event;
    }
    toJSON() {
        return {
            $mid: 4 /* MarshalledId.ScmResourceGroup */,
            sourceControlHandle: this.sourceControlHandle,
            groupHandle: this.handle
        };
    }
    splice(start, deleteCount, toInsert) {
        this.resources.splice(start, deleteCount, ...toInsert);
        this._resourceTree = undefined;
        this._onDidChangeResources.fire();
    }
    $updateGroup(features) {
        this.features = { ...this.features, ...features };
        this._onDidChange.fire();
    }
    $updateGroupLabel(label) {
        this.label = label;
        this._onDidChange.fire();
    }
}
class MainThreadSCMResource {
    constructor(proxy, sourceControlHandle, groupHandle, handle, sourceUri, resourceGroup, decorations, contextValue, command, multiDiffEditorOriginalUri, multiDiffEditorModifiedUri) {
        this.proxy = proxy;
        this.sourceControlHandle = sourceControlHandle;
        this.groupHandle = groupHandle;
        this.handle = handle;
        this.sourceUri = sourceUri;
        this.resourceGroup = resourceGroup;
        this.decorations = decorations;
        this.contextValue = contextValue;
        this.command = command;
        this.multiDiffEditorOriginalUri = multiDiffEditorOriginalUri;
        this.multiDiffEditorModifiedUri = multiDiffEditorModifiedUri;
    }
    open(preserveFocus) {
        return this.proxy.$executeResourceCommand(this.sourceControlHandle, this.groupHandle, this.handle, preserveFocus);
    }
    toJSON() {
        return {
            $mid: 3 /* MarshalledId.ScmResource */,
            sourceControlHandle: this.sourceControlHandle,
            groupHandle: this.groupHandle,
            handle: this.handle
        };
    }
}
class MainThreadSCMHistoryProvider {
    get historyItemRef() { return this._historyItemRef; }
    get historyItemRemoteRef() { return this._historyItemRemoteRef; }
    get historyItemBaseRef() { return this._historyItemBaseRef; }
    get historyItemRefChanges() { return this._historyItemRefChanges; }
    constructor(proxy, handle) {
        this.proxy = proxy;
        this.handle = handle;
        this._historyItemRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals
        }, undefined);
        this._historyItemRemoteRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals
        }, undefined);
        this._historyItemBaseRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals
        }, undefined);
        this._historyItemRefChanges = observableValue(this, { added: [], modified: [], removed: [], silent: false });
    }
    async resolveHistoryItemRefsCommonAncestor(historyItemRefs) {
        return this.proxy.$resolveHistoryItemRefsCommonAncestor(this.handle, historyItemRefs, CancellationToken.None);
    }
    async provideHistoryItemRefs(historyItemsRefs) {
        const historyItemRefs = await this.proxy.$provideHistoryItemRefs(this.handle, historyItemsRefs, CancellationToken.None);
        return historyItemRefs?.map(ref => ({ ...ref, icon: getIconFromIconDto(ref.icon) }));
    }
    async provideHistoryItems(options) {
        const historyItems = await this.proxy.$provideHistoryItems(this.handle, options, CancellationToken.None);
        return historyItems?.map(historyItem => toISCMHistoryItem(historyItem));
    }
    async provideHistoryItemChanges(historyItemId, historyItemParentId) {
        const changes = await this.proxy.$provideHistoryItemChanges(this.handle, historyItemId, historyItemParentId, CancellationToken.None);
        return changes?.map(change => ({
            uri: URI.revive(change.uri),
            originalUri: change.originalUri && URI.revive(change.originalUri),
            modifiedUri: change.modifiedUri && URI.revive(change.modifiedUri)
        }));
    }
    $onDidChangeCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        transaction(tx => {
            this._historyItemRef.set(toISCMHistoryItemRef(historyItemRef, historyItemRefColor), tx);
            this._historyItemRemoteRef.set(toISCMHistoryItemRef(historyItemRemoteRef, historyItemRemoteRefColor), tx);
            this._historyItemBaseRef.set(toISCMHistoryItemRef(historyItemBaseRef, historyItemBaseRefColor), tx);
        });
    }
    $onDidChangeHistoryItemRefs(historyItemRefs) {
        const added = historyItemRefs.added.map(ref => toISCMHistoryItemRef(ref));
        const modified = historyItemRefs.modified.map(ref => toISCMHistoryItemRef(ref));
        const removed = historyItemRefs.removed.map(ref => toISCMHistoryItemRef(ref));
        this._historyItemRefChanges.set({ added, modified, removed, silent: historyItemRefs.silent }, undefined);
    }
}
class MainThreadSCMProvider {
    static { this.ID_HANDLE = 0; }
    get id() { return this._id; }
    get handle() { return this._handle; }
    get label() { return this._label; }
    get rootUri() { return this._rootUri; }
    get inputBoxTextModel() { return this._inputBoxTextModel; }
    get contextValue() { return this._providerId; }
    get acceptInputCommand() { return this.features.acceptInputCommand; }
    get count() { return this._count; }
    get statusBarCommands() { return this._statusBarCommands; }
    get name() { return this._name ?? this._label; }
    get commitTemplate() { return this._commitTemplate; }
    get actionButton() { return this._actionButton; }
    get historyProvider() { return this._historyProvider; }
    constructor(proxy, _handle, _providerId, _label, _rootUri, _inputBoxTextModel, _quickDiffService, _uriIdentService, _workspaceContextService) {
        this.proxy = proxy;
        this._handle = _handle;
        this._providerId = _providerId;
        this._label = _label;
        this._rootUri = _rootUri;
        this._inputBoxTextModel = _inputBoxTextModel;
        this._quickDiffService = _quickDiffService;
        this._uriIdentService = _uriIdentService;
        this._workspaceContextService = _workspaceContextService;
        this._id = `scm${MainThreadSCMProvider.ID_HANDLE++}`;
        this.groups = [];
        this._onDidChangeResourceGroups = new Emitter();
        this.onDidChangeResourceGroups = this._onDidChangeResourceGroups.event;
        this._onDidChangeResources = new Emitter();
        this.onDidChangeResources = this._onDidChangeResources.event;
        this._groupsByHandle = Object.create(null);
        // get groups(): ISequence<ISCMResourceGroup> {
        // 	return {
        // 		elements: this._groups,
        // 		onDidSplice: this._onDidSplice.event
        // 	};
        // 	// return this._groups
        // 	// 	.filter(g => g.resources.elements.length > 0 || !g.features.hideWhenEmpty);
        // }
        this.features = {};
        this._count = observableValue(this, undefined);
        this._statusBarCommands = observableValue(this, undefined);
        this._commitTemplate = observableValue(this, '');
        this._actionButton = observableValue(this, undefined);
        this.isSCM = true;
        this.visible = true;
        this._historyProvider = observableValue(this, undefined);
        if (_rootUri) {
            const folder = this._workspaceContextService.getWorkspaceFolder(_rootUri);
            if (folder?.uri.toString() === _rootUri.toString()) {
                this._name = folder.name;
            }
            else if (_rootUri.path !== '/') {
                this._name = basename(_rootUri);
            }
        }
    }
    $updateSourceControl(features) {
        this.features = { ...this.features, ...features };
        if (typeof features.commitTemplate !== 'undefined') {
            this._commitTemplate.set(features.commitTemplate, undefined);
        }
        if (typeof features.actionButton !== 'undefined') {
            this._actionButton.set(features.actionButton ?? undefined, undefined);
        }
        if (typeof features.count !== 'undefined') {
            this._count.set(features.count, undefined);
        }
        if (typeof features.statusBarCommands !== 'undefined') {
            this._statusBarCommands.set(features.statusBarCommands, undefined);
        }
        if (features.hasQuickDiffProvider && !this._quickDiff) {
            this._quickDiff = this._quickDiffService.addQuickDiffProvider({
                label: features.quickDiffLabel ?? this.label,
                rootUri: this.rootUri,
                isSCM: this.isSCM,
                visible: this.visible,
                getOriginalResource: (uri) => this.getOriginalResource(uri)
            });
        }
        else if (features.hasQuickDiffProvider === false && this._quickDiff) {
            this._quickDiff.dispose();
            this._quickDiff = undefined;
        }
        if (features.hasHistoryProvider && !this.historyProvider.get()) {
            const historyProvider = new MainThreadSCMHistoryProvider(this.proxy, this.handle);
            this._historyProvider.set(historyProvider, undefined);
        }
        else if (features.hasHistoryProvider === false && this.historyProvider.get()) {
            this._historyProvider.set(undefined, undefined);
        }
    }
    $registerGroups(_groups) {
        const groups = _groups.map(([handle, id, label, features, multiDiffEditorEnableViewChanges]) => {
            const group = new MainThreadSCMResourceGroup(this.handle, handle, this, features, label, id, multiDiffEditorEnableViewChanges, this._uriIdentService);
            this._groupsByHandle[handle] = group;
            return group;
        });
        this.groups.splice(this.groups.length, 0, ...groups);
        this._onDidChangeResourceGroups.fire();
    }
    $updateGroup(handle, features) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        group.$updateGroup(features);
    }
    $updateGroupLabel(handle, label) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        group.$updateGroupLabel(label);
    }
    $spliceGroupResourceStates(splices) {
        for (const [groupHandle, groupSlices] of splices) {
            const group = this._groupsByHandle[groupHandle];
            if (!group) {
                console.warn(`SCM group ${groupHandle} not found in provider ${this.label}`);
                continue;
            }
            // reverse the splices sequence in order to apply them correctly
            groupSlices.reverse();
            for (const [start, deleteCount, rawResources] of groupSlices) {
                const resources = rawResources.map(rawResource => {
                    const [handle, sourceUri, icons, tooltip, strikeThrough, faded, contextValue, command, multiDiffEditorOriginalUri, multiDiffEditorModifiedUri] = rawResource;
                    const [light, dark] = icons;
                    const icon = ThemeIcon.isThemeIcon(light) ? light : URI.revive(light);
                    const iconDark = (ThemeIcon.isThemeIcon(dark) ? dark : URI.revive(dark)) || icon;
                    const decorations = {
                        icon: icon,
                        iconDark: iconDark,
                        tooltip,
                        strikeThrough,
                        faded
                    };
                    return new MainThreadSCMResource(this.proxy, this.handle, groupHandle, handle, URI.revive(sourceUri), group, decorations, contextValue || undefined, command, URI.revive(multiDiffEditorOriginalUri), URI.revive(multiDiffEditorModifiedUri));
                });
                group.splice(start, deleteCount, resources);
            }
        }
        this._onDidChangeResources.fire();
    }
    $unregisterGroup(handle) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        delete this._groupsByHandle[handle];
        this.groups.splice(this.groups.indexOf(group), 1);
        this._onDidChangeResourceGroups.fire();
    }
    async getOriginalResource(uri) {
        if (!this.features.hasQuickDiffProvider) {
            return null;
        }
        const result = await this.proxy.$provideOriginalResource(this.handle, uri, CancellationToken.None);
        return result && URI.revive(result);
    }
    $onDidChangeHistoryProviderCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        if (!this.historyProvider.get()) {
            return;
        }
        this._historyProvider.get()?.$onDidChangeCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef);
    }
    $onDidChangeHistoryProviderHistoryItemRefs(historyItemRefs) {
        if (!this.historyProvider.get()) {
            return;
        }
        this._historyProvider.get()?.$onDidChangeHistoryItemRefs(historyItemRefs);
    }
    toJSON() {
        return {
            $mid: 5 /* MarshalledId.ScmProvider */,
            handle: this.handle
        };
    }
    dispose() {
        this._quickDiff?.dispose();
    }
}
let MainThreadSCM = class MainThreadSCM {
    constructor(extHostContext, scmService, scmViewService, languageService, modelService, textModelService, quickDiffService, _uriIdentService, workspaceContextService) {
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.textModelService = textModelService;
        this.quickDiffService = quickDiffService;
        this._uriIdentService = _uriIdentService;
        this.workspaceContextService = workspaceContextService;
        this._repositories = new Map();
        this._repositoryBarriers = new Map();
        this._repositoryDisposables = new Map();
        this._disposables = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSCM);
        this._disposables.add(new SCMInputBoxContentProvider(this.textModelService, this.modelService, this.languageService));
    }
    dispose() {
        dispose(this._repositories.values());
        this._repositories.clear();
        dispose(this._repositoryDisposables.values());
        this._repositoryDisposables.clear();
        this._disposables.dispose();
    }
    async $registerSourceControl(handle, id, label, rootUri, inputBoxDocumentUri) {
        this._repositoryBarriers.set(handle, new Barrier());
        const inputBoxTextModelRef = await this.textModelService.createModelReference(URI.revive(inputBoxDocumentUri));
        const provider = new MainThreadSCMProvider(this._proxy, handle, id, label, rootUri ? URI.revive(rootUri) : undefined, inputBoxTextModelRef.object.textEditorModel, this.quickDiffService, this._uriIdentService, this.workspaceContextService);
        const repository = this.scmService.registerSCMProvider(provider);
        this._repositories.set(handle, repository);
        const disposable = combinedDisposable(inputBoxTextModelRef, Event.filter(this.scmViewService.onDidFocusRepository, r => r === repository)(_ => this._proxy.$setSelectedSourceControl(handle)), repository.input.onDidChange(({ value }) => this._proxy.$onInputBoxValueChange(handle, value)));
        this._repositoryDisposables.set(handle, disposable);
        if (this.scmViewService.focusedRepository === repository) {
            setTimeout(() => this._proxy.$setSelectedSourceControl(handle), 0);
        }
        if (repository.input.value) {
            setTimeout(() => this._proxy.$onInputBoxValueChange(handle, repository.input.value), 0);
        }
        this._repositoryBarriers.get(handle)?.open();
    }
    async $updateSourceControl(handle, features) {
        await this._repositoryBarriers.get(handle)?.wait();
        const repository = this._repositories.get(handle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateSourceControl(features);
    }
    async $unregisterSourceControl(handle) {
        await this._repositoryBarriers.get(handle)?.wait();
        const repository = this._repositories.get(handle);
        if (!repository) {
            return;
        }
        this._repositoryDisposables.get(handle).dispose();
        this._repositoryDisposables.delete(handle);
        repository.dispose();
        this._repositories.delete(handle);
    }
    async $registerGroups(sourceControlHandle, groups, splices) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$registerGroups(groups);
        provider.$spliceGroupResourceStates(splices);
    }
    async $updateGroup(sourceControlHandle, groupHandle, features) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateGroup(groupHandle, features);
    }
    async $updateGroupLabel(sourceControlHandle, groupHandle, label) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateGroupLabel(groupHandle, label);
    }
    async $spliceResourceStates(sourceControlHandle, splices) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$spliceGroupResourceStates(splices);
    }
    async $unregisterGroup(sourceControlHandle, handle) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$unregisterGroup(handle);
    }
    async $setInputBoxValue(sourceControlHandle, value) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.setValue(value, false);
    }
    async $setInputBoxPlaceholder(sourceControlHandle, placeholder) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.placeholder = placeholder;
    }
    async $setInputBoxEnablement(sourceControlHandle, enabled) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.enabled = enabled;
    }
    async $setInputBoxVisibility(sourceControlHandle, visible) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.visible = visible;
    }
    async $showValidationMessage(sourceControlHandle, message, type) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.showValidationMessage(message, type);
    }
    async $setValidationProviderIsEnabled(sourceControlHandle, enabled) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        if (enabled) {
            repository.input.validateInput = async (value, pos) => {
                const result = await this._proxy.$validateInput(sourceControlHandle, value, pos);
                return result && { message: result[0], type: result[1] };
            };
        }
        else {
            repository.input.validateInput = async () => undefined;
        }
    }
    async $onDidChangeHistoryProviderCurrentHistoryItemRefs(sourceControlHandle, historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$onDidChangeHistoryProviderCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef);
    }
    async $onDidChangeHistoryProviderHistoryItemRefs(sourceControlHandle, historyItemRefs) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$onDidChangeHistoryProviderHistoryItemRefs(historyItemRefs);
    }
};
MainThreadSCM = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSCM),
    __param(1, ISCMService),
    __param(2, ISCMViewService),
    __param(3, ILanguageService),
    __param(4, IModelService),
    __param(5, ITextModelService),
    __param(6, IQuickDiffService),
    __param(7, IUriIdentityService),
    __param(8, IWorkspaceContextService)
], MainThreadSCM);
export { MainThreadSCM };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNDTS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFNDTS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQWUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BILE9BQU8sRUFBZSxlQUFlLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxXQUFXLEVBQTRHLGVBQWUsRUFBbUQsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxTyxPQUFPLEVBQUUsY0FBYyxFQUFxRyxXQUFXLEVBQTZFLE1BQU0sK0JBQStCLENBQUM7QUFFMVAsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sdUNBQXVDLENBQUM7QUFFN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8s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
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
var FilesConfigurationService_1;
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, IFileService, hasReadonlyCapability } from '../../../../platform/files/common/files.js';
import { equals } from '../../../../base/common/objects.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { GlobalIdleValue } from '../../../../base/common/async.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { LRUCache, ResourceMap } from '../../../../base/common/map.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
export const AutoSaveAfterShortDelayContext = new RawContextKey('autoSaveAfterShortDelayContext', false, true);
export var AutoSaveMode;
(function (AutoSaveMode) {
    AutoSaveMode[AutoSaveMode["OFF"] = 0] = "OFF";
    AutoSaveMode[AutoSaveMode["AFTER_SHORT_DELAY"] = 1] = "AFTER_SHORT_DELAY";
    AutoSaveMode[AutoSaveMode["AFTER_LONG_DELAY"] = 2] = "AFTER_LONG_DELAY";
    AutoSaveMode[AutoSaveMode["ON_FOCUS_CHANGE"] = 3] = "ON_FOCUS_CHANGE";
    AutoSaveMode[AutoSaveMode["ON_WINDOW_CHANGE"] = 4] = "ON_WINDOW_CHANGE";
})(AutoSaveMode || (AutoSaveMode = {}));
export var AutoSaveDisabledReason;
(function (AutoSaveDisabledReason) {
    AutoSaveDisabledReason[AutoSaveDisabledReason["SETTINGS"] = 1] = "SETTINGS";
    AutoSaveDisabledReason[AutoSaveDisabledReason["OUT_OF_WORKSPACE"] = 2] = "OUT_OF_WORKSPACE";
    AutoSaveDisabledReason[AutoSaveDisabledReason["ERRORS"] = 3] = "ERRORS";
    AutoSaveDisabledReason[AutoSaveDisabledReason["DISABLED"] = 4] = "DISABLED";
})(AutoSaveDisabledReason || (AutoSaveDisabledReason = {}));
export const IFilesConfigurationService = createDecorator('filesConfigurationService');
let FilesConfigurationService = class FilesConfigurationService extends Disposable {
    static { FilesConfigurationService_1 = this; }
    static { this.DEFAULT_AUTO_SAVE_MODE = isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF; }
    static { this.DEFAULT_AUTO_SAVE_DELAY = 1000; }
    static { this.READONLY_MESSAGES = {
        providerReadonly: { value: localize('providerReadonly', "Editor is read-only because the file system of the file is read-only."), isTrusted: true },
        sessionReadonly: { value: localize({ key: 'sessionReadonly', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change', '{Locked="](command:{0})"}'] }, "Editor is read-only because the file was set read-only in this session. [Click here](command:{0}) to set writeable.", 'workbench.action.files.setActiveEditorWriteableInSession'), isTrusted: true },
        configuredReadonly: { value: localize({ key: 'configuredReadonly', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change', '{Locked="](command:{0})"}'] }, "Editor is read-only because the file was set read-only via settings. [Click here](command:{0}) to configure or [toggle for this session](command:{1}).", `workbench.action.openSettings?${encodeURIComponent('["files.readonly"]')}`, 'workbench.action.files.toggleActiveEditorReadonlyInSession'), isTrusted: true },
        fileLocked: { value: localize({ key: 'fileLocked', comment: ['Please do not translate the word "command", it is part of our internal syntax which must not change', '{Locked="](command:{0})"}'] }, "Editor is read-only because of file permissions. [Click here](command:{0}) to set writeable anyway.", 'workbench.action.files.setActiveEditorWriteableInSession'), isTrusted: true },
        fileReadonly: { value: localize('fileReadonly', "Editor is read-only because the file is read-only."), isTrusted: true }
    }; }
    constructor(contextKeyService, configurationService, contextService, environmentService, uriIdentityService, fileService, markerService, textResourceConfigurationService) {
        super();
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.markerService = markerService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this._onDidChangeAutoSaveConfiguration = this._register(new Emitter());
        this.onDidChangeAutoSaveConfiguration = this._onDidChangeAutoSaveConfiguration.event;
        this._onDidChangeAutoSaveDisabled = this._register(new Emitter());
        this.onDidChangeAutoSaveDisabled = this._onDidChangeAutoSaveDisabled.event;
        this._onDidChangeFilesAssociation = this._register(new Emitter());
        this.onDidChangeFilesAssociation = this._onDidChangeFilesAssociation.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this.autoSaveConfigurationCache = new LRUCache(1000);
        this.autoSaveAfterShortDelayOverrides = new ResourceMap();
        this.autoSaveDisabledOverrides = new ResourceMap();
        this.readonlyIncludeMatcher = this._register(new GlobalIdleValue(() => this.createReadonlyMatcher(FILES_READONLY_INCLUDE_CONFIG)));
        this.readonlyExcludeMatcher = this._register(new GlobalIdleValue(() => this.createReadonlyMatcher(FILES_READONLY_EXCLUDE_CONFIG)));
        this.sessionReadonlyOverrides = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.autoSaveAfterShortDelayContext = AutoSaveAfterShortDelayContext.bindTo(contextKeyService);
        const configuration = configurationService.getValue();
        this.currentGlobalAutoSaveConfiguration = this.computeAutoSaveConfiguration(undefined, configuration.files);
        this.currentFilesAssociationConfiguration = configuration?.files?.associations;
        this.currentHotExitConfiguration = configuration?.files?.hotExit || HotExitConfiguration.ON_EXIT;
        this.onFilesConfigurationChange(configuration, false);
        this.registerListeners();
    }
    createReadonlyMatcher(config) {
        const matcher = this._register(new ResourceGlobMatcher(resource => this.configurationService.getValue(config, { resource }), event => event.affectsConfiguration(config), this.contextService, this.configurationService));
        this._register(matcher.onExpressionChange(() => this._onDidChangeReadonly.fire()));
        return matcher;
    }
    isReadonly(resource, stat) {
        // if the entire file system provider is readonly, we respect that
        // and do not allow to change readonly. we take this as a hint that
        // the provider has no capabilities of writing.
        const provider = this.fileService.getProvider(resource.scheme);
        if (provider && hasReadonlyCapability(provider)) {
            return provider.readOnlyMessage ?? FilesConfigurationService_1.READONLY_MESSAGES.providerReadonly;
        }
        // session override always wins over the others
        const sessionReadonlyOverride = this.sessionReadonlyOverrides.get(resource);
        if (typeof sessionReadonlyOverride === 'boolean') {
            return sessionReadonlyOverride === true ? FilesConfigurationService_1.READONLY_MESSAGES.sessionReadonly : false;
        }
        if (this.uriIdentityService.extUri.isEqualOrParent(resource, this.environmentService.userRoamingDataHome) ||
            this.uriIdentityService.extUri.isEqual(resource, this.contextService.getWorkspace().configuration ?? undefined)) {
            return false; // explicitly exclude some paths from readonly that we need for configuration
        }
        // configured glob patterns win over stat information
        if (this.readonlyIncludeMatcher.value.matches(resource)) {
            return !this.readonlyExcludeMatcher.value.matches(resource) ? FilesConfigurationService_1.READONLY_MESSAGES.configuredReadonly : false;
        }
        // check if file is locked and configured to treat as readonly
        if (this.configuredReadonlyFromPermissions && stat?.locked) {
            return FilesConfigurationService_1.READONLY_MESSAGES.fileLocked;
        }
        // check if file is marked readonly from the file system provider
        if (stat?.readonly) {
            return FilesConfigurationService_1.READONLY_MESSAGES.fileReadonly;
        }
        return false;
    }
    async updateReadonly(resource, readonly) {
        if (readonly === 'toggle') {
            let stat = undefined;
            try {
                stat = await this.fileService.resolve(resource, { resolveMetadata: true });
            }
            catch (error) {
                // ignore
            }
            readonly = !this.isReadonly(resource, stat);
        }
        if (readonly === 'reset') {
            this.sessionReadonlyOverrides.delete(resource);
        }
        else {
            this.sessionReadonlyOverrides.set(resource, readonly);
        }
        this._onDidChangeReadonly.fire();
    }
    registerListeners() {
        // Files configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('files')) {
                this.onFilesConfigurationChange(this.configurationService.getValue(), true);
            }
        }));
    }
    onFilesConfigurationChange(configuration, fromEvent) {
        // Auto Save
        this.currentGlobalAutoSaveConfiguration = this.computeAutoSaveConfiguration(undefined, configuration.files);
        this.autoSaveConfigurationCache.clear();
        this.autoSaveAfterShortDelayContext.set(this.getAutoSaveMode(undefined).mode === 1 /* AutoSaveMode.AFTER_SHORT_DELAY */);
        if (fromEvent) {
            this._onDidChangeAutoSaveConfiguration.fire();
        }
        // Check for change in files associations
        const filesAssociation = configuration?.files?.associations;
        if (!equals(this.currentFilesAssociationConfiguration, filesAssociation)) {
            this.currentFilesAssociationConfiguration = filesAssociation;
            if (fromEvent) {
                this._onDidChangeFilesAssociation.fire();
            }
        }
        // Hot exit
        const hotExitMode = configuration?.files?.hotExit;
        if (hotExitMode === HotExitConfiguration.OFF || hotExitMode === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
            this.currentHotExitConfiguration = hotExitMode;
        }
        else {
            this.currentHotExitConfiguration = HotExitConfiguration.ON_EXIT;
        }
        // Readonly
        const readonlyFromPermissions = Boolean(configuration?.files?.readonlyFromPermissions);
        if (readonlyFromPermissions !== Boolean(this.configuredReadonlyFromPermissions)) {
            this.configuredReadonlyFromPermissions = readonlyFromPermissions;
            if (fromEvent) {
                this._onDidChangeReadonly.fire();
            }
        }
    }
    getAutoSaveConfiguration(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (resource) {
            let resourceAutoSaveConfiguration = this.autoSaveConfigurationCache.get(resource);
            if (!resourceAutoSaveConfiguration) {
                resourceAutoSaveConfiguration = this.computeAutoSaveConfiguration(resource, this.textResourceConfigurationService.getValue(resource, 'files'));
                this.autoSaveConfigurationCache.set(resource, resourceAutoSaveConfiguration);
            }
            return resourceAutoSaveConfiguration;
        }
        return this.currentGlobalAutoSaveConfiguration;
    }
    computeAutoSaveConfiguration(resource, filesConfiguration) {
        let autoSave;
        let autoSaveDelay;
        let autoSaveWorkspaceFilesOnly;
        let autoSaveWhenNoErrors;
        let isOutOfWorkspace;
        let isShortAutoSaveDelay;
        switch (filesConfiguration?.autoSave ?? FilesConfigurationService_1.DEFAULT_AUTO_SAVE_MODE) {
            case AutoSaveConfiguration.AFTER_DELAY: {
                autoSave = 'afterDelay';
                autoSaveDelay = typeof filesConfiguration?.autoSaveDelay === 'number' && filesConfiguration.autoSaveDelay >= 0 ? filesConfiguration.autoSaveDelay : FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY;
                isShortAutoSaveDelay = autoSaveDelay <= FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY;
                break;
            }
            case AutoSaveConfiguration.ON_FOCUS_CHANGE:
                autoSave = 'onFocusChange';
                break;
            case AutoSaveConfiguration.ON_WINDOW_CHANGE:
                autoSave = 'onWindowChange';
                break;
        }
        if (filesConfiguration?.autoSaveWorkspaceFilesOnly === true) {
            autoSaveWorkspaceFilesOnly = true;
            if (resource && !this.contextService.isInsideWorkspace(resource)) {
                isOutOfWorkspace = true;
                isShortAutoSaveDelay = undefined; // out of workspace file are not auto saved with this configuration
            }
        }
        if (filesConfiguration?.autoSaveWhenNoErrors === true) {
            autoSaveWhenNoErrors = true;
            isShortAutoSaveDelay = undefined; // this configuration disables short auto save delay
        }
        return {
            autoSave,
            autoSaveDelay,
            autoSaveWorkspaceFilesOnly,
            autoSaveWhenNoErrors,
            isOutOfWorkspace,
            isShortAutoSaveDelay
        };
    }
    toResource(resourceOrEditor) {
        if (resourceOrEditor instanceof EditorInput) {
            return EditorResourceAccessor.getOriginalUri(resourceOrEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        }
        return resourceOrEditor;
    }
    hasShortAutoSaveDelay(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (resource && this.autoSaveAfterShortDelayOverrides.has(resource)) {
            return true; // overridden to be enabled after short delay
        }
        if (this.getAutoSaveConfiguration(resource).isShortAutoSaveDelay) {
            return !resource || !this.autoSaveDisabledOverrides.has(resource);
        }
        return false;
    }
    getAutoSaveMode(resourceOrEditor, saveReason) {
        const resource = this.toResource(resourceOrEditor);
        if (resource && this.autoSaveAfterShortDelayOverrides.has(resource)) {
            return { mode: 1 /* AutoSaveMode.AFTER_SHORT_DELAY */ }; // overridden to be enabled after short delay
        }
        if (resource && this.autoSaveDisabledOverrides.has(resource)) {
            return { mode: 0 /* AutoSaveMode.OFF */, reason: 4 /* AutoSaveDisabledReason.DISABLED */ };
        }
        const autoSaveConfiguration = this.getAutoSaveConfiguration(resource);
        if (typeof autoSaveConfiguration.autoSave === 'undefined') {
            return { mode: 0 /* AutoSaveMode.OFF */, reason: 1 /* AutoSaveDisabledReason.SETTINGS */ };
        }
        if (typeof saveReason === 'number') {
            if ((autoSaveConfiguration.autoSave === 'afterDelay' && saveReason !== 2 /* SaveReason.AUTO */) ||
                (autoSaveConfiguration.autoSave === 'onFocusChange' && saveReason !== 3 /* SaveReason.FOCUS_CHANGE */ && saveReason !== 4 /* SaveReason.WINDOW_CHANGE */) ||
                (autoSaveConfiguration.autoSave === 'onWindowChange' && saveReason !== 4 /* SaveReason.WINDOW_CHANGE */)) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 1 /* AutoSaveDisabledReason.SETTINGS */ };
            }
        }
        if (resource) {
            if (autoSaveConfiguration.autoSaveWorkspaceFilesOnly && autoSaveConfiguration.isOutOfWorkspace) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 2 /* AutoSaveDisabledReason.OUT_OF_WORKSPACE */ };
            }
            if (autoSaveConfiguration.autoSaveWhenNoErrors && this.markerService.read({ resource, take: 1, severities: MarkerSeverity.Error }).length > 0) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 3 /* AutoSaveDisabledReason.ERRORS */ };
            }
        }
        switch (autoSaveConfiguration.autoSave) {
            case 'afterDelay':
                if (typeof autoSaveConfiguration.autoSaveDelay === 'number' && autoSaveConfiguration.autoSaveDelay <= FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY) {
                    // Explicitly mark auto save configurations as long running
                    // if they are configured to not run when there are errors.
                    // The rationale here is that errors may come in after auto
                    // save has been scheduled and then further delay the auto
                    // save until resolved.
                    return { mode: autoSaveConfiguration.autoSaveWhenNoErrors ? 2 /* AutoSaveMode.AFTER_LONG_DELAY */ : 1 /* AutoSaveMode.AFTER_SHORT_DELAY */ };
                }
                return { mode: 2 /* AutoSaveMode.AFTER_LONG_DELAY */ };
            case 'onFocusChange':
                return { mode: 3 /* AutoSaveMode.ON_FOCUS_CHANGE */ };
            case 'onWindowChange':
                return { mode: 4 /* AutoSaveMode.ON_WINDOW_CHANGE */ };
        }
    }
    async toggleAutoSave() {
        const currentSetting = this.configurationService.getValue('files.autoSave');
        let newAutoSaveValue;
        if ([AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE].some(setting => setting === currentSetting)) {
            newAutoSaveValue = AutoSaveConfiguration.OFF;
        }
        else {
            newAutoSaveValue = AutoSaveConfiguration.AFTER_DELAY;
        }
        return this.configurationService.updateValue('files.autoSave', newAutoSaveValue);
    }
    enableAutoSaveAfterShortDelay(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (!resource) {
            return Disposable.None;
        }
        const counter = this.autoSaveAfterShortDelayOverrides.get(resource) ?? 0;
        this.autoSaveAfterShortDelayOverrides.set(resource, counter + 1);
        return toDisposable(() => {
            const counter = this.autoSaveAfterShortDelayOverrides.get(resource) ?? 0;
            if (counter <= 1) {
                this.autoSaveAfterShortDelayOverrides.delete(resource);
            }
            else {
                this.autoSaveAfterShortDelayOverrides.set(resource, counter - 1);
            }
        });
    }
    disableAutoSave(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (!resource) {
            return Disposable.None;
        }
        const counter = this.autoSaveDisabledOverrides.get(resource) ?? 0;
        this.autoSaveDisabledOverrides.set(resource, counter + 1);
        if (counter === 0) {
            this._onDidChangeAutoSaveDisabled.fire(resource);
        }
        return toDisposable(() => {
            const counter = this.autoSaveDisabledOverrides.get(resource) ?? 0;
            if (counter <= 1) {
                this.autoSaveDisabledOverrides.delete(resource);
                this._onDidChangeAutoSaveDisabled.fire(resource);
            }
            else {
                this.autoSaveDisabledOverrides.set(resource, counter - 1);
            }
        });
    }
    get isHotExitEnabled() {
        if (this.contextService.getWorkspace().transient) {
            // Transient workspace: hot exit is disabled because
            // transient workspaces are not restored upon restart
            return false;
        }
        return this.currentHotExitConfiguration !== HotExitConfiguration.OFF;
    }
    get hotExitConfiguration() {
        return this.currentHotExitConfiguration;
    }
    preventSaveConflicts(resource, language) {
        return this.configurationService.getValue('files.saveConflictResolution', { resource, overrideIdentifier: language }) !== 'overwriteFileOnDisk';
    }
};
FilesConfigurationService = FilesConfigurationService_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IEnvironmentService),
    __param(4, IUriIdentityService),
    __param(5, IFileService),
    __param(6, IMarkerService),
    __param(7, ITextResourceConfigurationService)
], FilesConfigurationService);
export { FilesConfigurationService };
registerSingleton(IFilesConfigurationService, FilesConfigurationService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXNDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZmlsZXNDb25maWd1cmF0aW9uL2NvbW1vbi9maWxlc0NvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFlLE1BQU0sc0RBQXNELENBQUM7QUFDdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBeUIsWUFBWSxFQUFpQixxQkFBcUIsRUFBMkIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoUyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFl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
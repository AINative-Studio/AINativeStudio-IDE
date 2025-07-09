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
import * as nls from '../../../../nls.js';
import * as json from '../../../../base/common/json.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { Queue } from '../../../../base/common/async.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { FOLDER_SETTINGS_PATH, WORKSPACE_STANDALONE_CONFIGURATIONS, TASKS_CONFIGURATION_KEY, LAUNCH_CONFIGURATION_KEY, USER_STANDALONE_CONFIGURATIONS, TASKS_DEFAULT, FOLDER_SCOPES, IWorkbenchConfigurationService, APPLICATION_SCOPES, MCP_CONFIGURATION_KEY } from './configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Extensions as ConfigurationExtensions, keyFromOverrideIdentifiers, OVERRIDE_PROPERTY_REGEX } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IPreferencesService } from '../../preferences/common/preferences.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
export var ConfigurationEditingErrorCode;
(function (ConfigurationEditingErrorCode) {
    /**
     * Error when trying to write a configuration key that is not registered.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_UNKNOWN_KEY"] = 0] = "ERROR_UNKNOWN_KEY";
    /**
     * Error when trying to write an application setting into workspace settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION"] = 1] = "ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION";
    /**
     * Error when trying to write a machne setting into workspace settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE"] = 2] = "ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE";
    /**
     * Error when trying to write an invalid folder configuration key to folder settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_FOLDER_CONFIGURATION"] = 3] = "ERROR_INVALID_FOLDER_CONFIGURATION";
    /**
     * Error when trying to write to user target but not supported for provided key.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_USER_TARGET"] = 4] = "ERROR_INVALID_USER_TARGET";
    /**
     * Error when trying to write to user target but not supported for provided key.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_TARGET"] = 5] = "ERROR_INVALID_WORKSPACE_TARGET";
    /**
     * Error when trying to write a configuration key to folder target
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_FOLDER_TARGET"] = 6] = "ERROR_INVALID_FOLDER_TARGET";
    /**
     * Error when trying to write to language specific setting but not supported for preovided key
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION"] = 7] = "ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION";
    /**
     * Error when trying to write to the workspace configuration without having a workspace opened.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_NO_WORKSPACE_OPENED"] = 8] = "ERROR_NO_WORKSPACE_OPENED";
    /**
     * Error when trying to write and save to the configuration file while it is dirty in the editor.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_CONFIGURATION_FILE_DIRTY"] = 9] = "ERROR_CONFIGURATION_FILE_DIRTY";
    /**
     * Error when trying to write and save to the configuration file while it is not the latest in the disk.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_CONFIGURATION_FILE_MODIFIED_SINCE"] = 10] = "ERROR_CONFIGURATION_FILE_MODIFIED_SINCE";
    /**
     * Error when trying to write to a configuration file that contains JSON errors.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_CONFIGURATION"] = 11] = "ERROR_INVALID_CONFIGURATION";
    /**
     * Error when trying to write a policy configuration
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_POLICY_CONFIGURATION"] = 12] = "ERROR_POLICY_CONFIGURATION";
    /**
     * Internal Error.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INTERNAL"] = 13] = "ERROR_INTERNAL";
})(ConfigurationEditingErrorCode || (ConfigurationEditingErrorCode = {}));
export class ConfigurationEditingError extends ErrorNoTelemetry {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export var EditableConfigurationTarget;
(function (EditableConfigurationTarget) {
    EditableConfigurationTarget[EditableConfigurationTarget["USER_LOCAL"] = 1] = "USER_LOCAL";
    EditableConfigurationTarget[EditableConfigurationTarget["USER_REMOTE"] = 2] = "USER_REMOTE";
    EditableConfigurationTarget[EditableConfigurationTarget["WORKSPACE"] = 3] = "WORKSPACE";
    EditableConfigurationTarget[EditableConfigurationTarget["WORKSPACE_FOLDER"] = 4] = "WORKSPACE_FOLDER";
})(EditableConfigurationTarget || (EditableConfigurationTarget = {}));
let ConfigurationEditing = class ConfigurationEditing {
    constructor(remoteSettingsResource, configurationService, contextService, userDataProfileService, userDataProfilesService, fileService, textModelResolverService, textFileService, notificationService, preferencesService, editorService, uriIdentityService, filesConfigurationService) {
        this.remoteSettingsResource = remoteSettingsResource;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.textModelResolverService = textModelResolverService;
        this.textFileService = textFileService;
        this.notificationService = notificationService;
        this.preferencesService = preferencesService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.filesConfigurationService = filesConfigurationService;
        this.queue = new Queue();
    }
    async writeConfiguration(target, value, options = {}) {
        const operation = this.getConfigurationEditOperation(target, value, options.scopes || {});
        // queue up writes to prevent race conditions
        return this.queue.queue(async () => {
            try {
                await this.doWriteConfiguration(operation, options);
            }
            catch (error) {
                if (options.donotNotifyError) {
                    throw error;
                }
                await this.onError(error, operation, options.scopes);
            }
        });
    }
    async doWriteConfiguration(operation, options) {
        await this.validate(operation.target, operation, !options.handleDirtyFile, options.scopes || {});
        const resource = operation.resource;
        const reference = await this.resolveModelReference(resource);
        try {
            const formattingOptions = this.getFormattingOptions(reference.object.textEditorModel);
            await this.updateConfiguration(operation, reference.object.textEditorModel, formattingOptions, options);
        }
        finally {
            reference.dispose();
        }
    }
    async updateConfiguration(operation, model, formattingOptions, options) {
        if (this.hasParseErrors(model.getValue(), operation)) {
            throw this.toConfigurationEditingError(11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */, operation.target, operation);
        }
        if (this.textFileService.isDirty(model.uri) && options.handleDirtyFile) {
            switch (options.handleDirtyFile) {
                case 'save':
                    await this.save(model, operation);
                    break;
                case 'revert':
                    await this.textFileService.revert(model.uri);
                    break;
            }
        }
        const edit = this.getEdits(operation, model.getValue(), formattingOptions)[0];
        if (edit) {
            let disposable;
            try {
                // Optimization: we apply edits to a text model and save it
                // right after. Use the files config service to signal this
                // to the workbench to optimise the UI during this operation.
                // For example, avoids to briefly show dirty indicators.
                disposable = this.filesConfigurationService.enableAutoSaveAfterShortDelay(model.uri);
                if (this.applyEditsToBuffer(edit, model)) {
                    await this.save(model, operation);
                }
            }
            finally {
                disposable?.dispose();
            }
        }
    }
    async save(model, operation) {
        try {
            await this.textFileService.save(model.uri, { ignoreErrorHandler: true });
        }
        catch (error) {
            if (error.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                throw this.toConfigurationEditingError(10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */, operation.target, operation);
            }
            throw new ConfigurationEditingError(nls.localize('fsError', "Error while writing to {0}. {1}", this.stringifyTarget(operation.target), error.message), 13 /* ConfigurationEditingErrorCode.ERROR_INTERNAL */);
        }
    }
    applyEditsToBuffer(edit, model) {
        const startPosition = model.getPositionAt(edit.offset);
        const endPosition = model.getPositionAt(edit.offset + edit.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        const currentText = model.getValueInRange(range);
        if (edit.content !== currentText) {
            const editOperation = currentText ? EditOperation.replace(range, edit.content) : EditOperation.insert(startPosition, edit.content);
            model.pushEditOperations([new Selection(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column)], [editOperation], () => []);
            return true;
        }
        return false;
    }
    getEdits({ value, jsonPath }, modelContent, formattingOptions) {
        if (jsonPath.length) {
            return setProperty(modelContent, jsonPath, value, formattingOptions);
        }
        // Without jsonPath, the entire configuration file is being replaced, so we just use JSON.stringify
        const content = JSON.stringify(value, null, formattingOptions.insertSpaces && formattingOptions.tabSize ? ' '.repeat(formattingOptions.tabSize) : '\t');
        return [{
                content,
                length: modelContent.length,
                offset: 0
            }];
    }
    getFormattingOptions(model) {
        const { insertSpaces, tabSize } = model.getOptions();
        const eol = model.getEOL();
        return { insertSpaces, tabSize, eol };
    }
    async onError(error, operation, scopes) {
        switch (error.code) {
            case 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */:
                this.onInvalidConfigurationError(error, operation);
                break;
            case 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */:
                this.onConfigurationFileDirtyError(error, operation, scopes);
                break;
            case 10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */:
                return this.doWriteConfiguration(operation, { scopes, handleDirtyFile: 'revert' });
            default:
                this.notificationService.error(error.message);
        }
    }
    onInvalidConfigurationError(error, operation) {
        const openStandAloneConfigurationActionLabel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY ? nls.localize('openTasksConfiguration', "Open Tasks Configuration")
            : operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY ? nls.localize('openLaunchConfiguration', "Open Launch Configuration")
                : operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY ? nls.localize('openMcpConfiguration', "Open MCP Configuration")
                    : null;
        if (openStandAloneConfigurationActionLabel) {
            this.notificationService.prompt(Severity.Error, error.message, [{
                    label: openStandAloneConfigurationActionLabel,
                    run: () => this.openFile(operation.resource)
                }]);
        }
        else {
            this.notificationService.prompt(Severity.Error, error.message, [{
                    label: nls.localize('open', "Open Settings"),
                    run: () => this.openSettings(operation)
                }]);
        }
    }
    onConfigurationFileDirtyError(error, operation, scopes) {
        const openStandAloneConfigurationActionLabel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY ? nls.localize('openTasksConfiguration', "Open Tasks Configuration")
            : operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY ? nls.localize('openLaunchConfiguration', "Open Launch Configuration")
                : null;
        if (openStandAloneConfigurationActionLabel) {
            this.notificationService.prompt(Severity.Error, error.message, [{
                    label: nls.localize('saveAndRetry', "Save and Retry"),
                    run: () => {
                        const key = operation.key ? `${operation.workspaceStandAloneConfigurationKey}.${operation.key}` : operation.workspaceStandAloneConfigurationKey;
                        this.writeConfiguration(operation.target, { key, value: operation.value }, { handleDirtyFile: 'save', scopes });
                    }
                },
                {
                    label: openStandAloneConfigurationActionLabel,
                    run: () => this.openFile(operation.resource)
                }]);
        }
        else {
            this.notificationService.prompt(Severity.Error, error.message, [{
                    label: nls.localize('saveAndRetry', "Save and Retry"),
                    run: () => this.writeConfiguration(operation.target, { key: operation.key, value: operation.value }, { handleDirtyFile: 'save', scopes })
                },
                {
                    label: nls.localize('open', "Open Settings"),
                    run: () => this.openSettings(operation)
                }]);
        }
    }
    openSettings(operation) {
        const options = { jsonEditor: true };
        switch (operation.target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                this.preferencesService.openUserSettings(options);
                break;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                this.preferencesService.openRemoteSettings(options);
                break;
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                this.preferencesService.openWorkspaceSettings(options);
                break;
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                if (operation.resource) {
                    const workspaceFolder = this.contextService.getWorkspaceFolder(operation.resource);
                    if (workspaceFolder) {
                        this.preferencesService.openFolderSettings({ folderUri: workspaceFolder.uri, jsonEditor: true });
                    }
                }
                break;
        }
    }
    openFile(resource) {
        this.editorService.openEditor({ resource, options: { pinned: true } });
    }
    toConfigurationEditingError(code, target, operation) {
        const message = this.toErrorMessage(code, target, operation);
        return new ConfigurationEditingError(message, code);
    }
    toErrorMessage(error, target, operation) {
        switch (error) {
            // API constraints
            case 12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */: return nls.localize('errorPolicyConfiguration', "Unable to write {0} because it is configured in system policy.", operation.key);
            case 0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */: return nls.localize('errorUnknownKey', "Unable to write to {0} because {1} is not a registered configuration.", this.stringifyTarget(target), operation.key);
            case 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */: return nls.localize('errorInvalidWorkspaceConfigurationApplication', "Unable to write {0} to Workspace Settings. This setting can be written only into User settings.", operation.key);
            case 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */: return nls.localize('errorInvalidWorkspaceConfigurationMachine', "Unable to write {0} to Workspace Settings. This setting can be written only into User settings.", operation.key);
            case 3 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION */: return nls.localize('errorInvalidFolderConfiguration', "Unable to write to Folder Settings because {0} does not support the folder resource scope.", operation.key);
            case 4 /* ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET */: return nls.localize('errorInvalidUserTarget', "Unable to write to User Settings because {0} does not support for global scope.", operation.key);
            case 5 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_TARGET */: return nls.localize('errorInvalidWorkspaceTarget', "Unable to write to Workspace Settings because {0} does not support for workspace scope in a multi folder workspace.", operation.key);
            case 6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */: return nls.localize('errorInvalidFolderTarget', "Unable to write to Folder Settings because no resource is provided.");
            case 7 /* ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION */: return nls.localize('errorInvalidResourceLanguageConfiguration', "Unable to write to Language Settings because {0} is not a resource language setting.", operation.key);
            case 8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */: return nls.localize('errorNoWorkspaceOpened', "Unable to write to {0} because no workspace is opened. Please open a workspace first and try again.", this.stringifyTarget(target));
            // User issues
            case 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */: {
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidTaskConfiguration', "Unable to write into the tasks configuration file. Please open it to correct errors/warnings in it and try again.");
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidLaunchConfiguration', "Unable to write into the launch configuration file. Please open it to correct errors/warnings in it and try again.");
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidMCPConfiguration', "Unable to write into the MCP configuration file. Please open it to correct errors/warnings in it and try again.");
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorInvalidConfiguration', "Unable to write into user settings. Please open the user settings to correct errors/warnings in it and try again.");
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorInvalidRemoteConfiguration', "Unable to write into remote user settings. Please open the remote user settings to correct errors/warnings in it and try again.");
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorInvalidConfigurationWorkspace', "Unable to write into workspace settings. Please open the workspace settings to correct errors/warnings in the file and try again.");
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                        let workspaceFolderName = '<<unknown>>';
                        if (operation.resource) {
                            const folder = this.contextService.getWorkspaceFolder(operation.resource);
                            if (folder) {
                                workspaceFolderName = folder.name;
                            }
                        }
                        return nls.localize('errorInvalidConfigurationFolder', "Unable to write into folder settings. Please open the '{0}' folder settings to correct errors/warnings in it and try again.", workspaceFolderName);
                    }
                    default:
                        return '';
                }
            }
            case 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */: {
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorTasksConfigurationFileDirty', "Unable to write into tasks configuration file because the file has unsaved changes. Please save it first and then try again.");
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorLaunchConfigurationFileDirty', "Unable to write into launch configuration file because the file has unsaved changes. Please save it first and then try again.");
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorMCPConfigurationFileDirty', "Unable to write into MCP configuration file because the file has unsaved changes. Please save it first and then try again.");
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorConfigurationFileDirty', "Unable to write into user settings because the file has unsaved changes. Please save the user settings file first and then try again.");
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorRemoteConfigurationFileDirty', "Unable to write into remote user settings because the file has unsaved changes. Please save the remote user settings file first and then try again.");
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorConfigurationFileDirtyWorkspace', "Unable to write into workspace settings because the file has unsaved changes. Please save the workspace settings file first and then try again.");
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                        let workspaceFolderName = '<<unknown>>';
                        if (operation.resource) {
                            const folder = this.contextService.getWorkspaceFolder(operation.resource);
                            if (folder) {
                                workspaceFolderName = folder.name;
                            }
                        }
                        return nls.localize('errorConfigurationFileDirtyFolder', "Unable to write into folder settings because the file has unsaved changes. Please save the '{0}' folder settings file first and then try again.", workspaceFolderName);
                    }
                    default:
                        return '';
                }
            }
            case 10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */:
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorTasksConfigurationFileModifiedSince', "Unable to write into tasks configuration file because the content of the file is newer.");
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorLaunchConfigurationFileModifiedSince', "Unable to write into launch configuration file because the content of the file is newer.");
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorMCPConfigurationFileModifiedSince', "Unable to write into MCP configuration file because the content of the file is newer.");
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorConfigurationFileModifiedSince', "Unable to write into user settings because the content of the file is newer.");
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorRemoteConfigurationFileModifiedSince', "Unable to write into remote user settings because the content of the file is newer.");
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorConfigurationFileModifiedSinceWorkspace', "Unable to write into workspace settings because the content of the file is newer.");
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                        return nls.localize('errorConfigurationFileModifiedSinceFolder', "Unable to write into folder settings because the content of the file is newer.");
                }
            case 13 /* ConfigurationEditingErrorCode.ERROR_INTERNAL */: return nls.localize('errorUnknown', "Unable to write to {0} because of an internal error.", this.stringifyTarget(target));
        }
    }
    stringifyTarget(target) {
        switch (target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                return nls.localize('userTarget', "User Settings");
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                return nls.localize('remoteUserTarget', "Remote User Settings");
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                return nls.localize('workspaceTarget', "Workspace Settings");
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                return nls.localize('folderTarget', "Folder Settings");
            default:
                return '';
        }
    }
    defaultResourceValue(resource) {
        const basename = this.uriIdentityService.extUri.basename(resource);
        const configurationValue = basename.substr(0, basename.length - this.uriIdentityService.extUri.extname(resource).length);
        switch (configurationValue) {
            case TASKS_CONFIGURATION_KEY: return TASKS_DEFAULT;
            default: return '{}';
        }
    }
    async resolveModelReference(resource) {
        const exists = await this.fileService.exists(resource);
        if (!exists) {
            await this.textFileService.write(resource, this.defaultResourceValue(resource), { encoding: 'utf8' });
        }
        return this.textModelResolverService.createModelReference(resource);
    }
    hasParseErrors(content, operation) {
        // If we write to a workspace standalone file and replace the entire contents (no key provided)
        // we can return here because any parse errors can safely be ignored since all contents are replaced
        if (operation.workspaceStandAloneConfigurationKey && !operation.key) {
            return false;
        }
        const parseErrors = [];
        json.parse(content, parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        return parseErrors.length > 0;
    }
    async validate(target, operation, checkDirty, overrides) {
        if (this.configurationService.inspect(operation.key).policyValue !== undefined) {
            throw this.toConfigurationEditingError(12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */, target, operation);
        }
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const configurationScope = configurationProperties[operation.key]?.scope;
        /**
         * Key to update must be a known setting from the registry unless
         * 	- the key is standalone configuration (eg: tasks, debug)
         * 	- the key is an override identifier
         * 	- the operation is to delete the key
         */
        if (!operation.workspaceStandAloneConfigurationKey) {
            const validKeys = this.configurationService.keys().default;
            if (validKeys.indexOf(operation.key) < 0 && !OVERRIDE_PROPERTY_REGEX.test(operation.key) && operation.value !== undefined) {
                throw this.toConfigurationEditingError(0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */, target, operation);
            }
        }
        if (operation.workspaceStandAloneConfigurationKey) {
            // Global launches are not supported
            if ((operation.workspaceStandAloneConfigurationKey !== TASKS_CONFIGURATION_KEY) && (operation.workspaceStandAloneConfigurationKey !== MCP_CONFIGURATION_KEY) && (target === 1 /* EditableConfigurationTarget.USER_LOCAL */ || target === 2 /* EditableConfigurationTarget.USER_REMOTE */)) {
                throw this.toConfigurationEditingError(4 /* ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET */, target, operation);
            }
        }
        // Target cannot be workspace or folder if no workspace opened
        if ((target === 3 /* EditableConfigurationTarget.WORKSPACE */ || target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) && this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            throw this.toConfigurationEditingError(8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */, target, operation);
        }
        if (target === 3 /* EditableConfigurationTarget.WORKSPACE */) {
            if (!operation.workspaceStandAloneConfigurationKey && !OVERRIDE_PROPERTY_REGEX.test(operation.key)) {
                if (configurationScope && APPLICATION_SCOPES.includes(configurationScope)) {
                    throw this.toConfigurationEditingError(1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */, target, operation);
                }
                if (configurationScope === 2 /* ConfigurationScope.MACHINE */) {
                    throw this.toConfigurationEditingError(2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */, target, operation);
                }
            }
        }
        if (target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) {
            if (!operation.resource) {
                throw this.toConfigurationEditingError(6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */, target, operation);
            }
            if (!operation.workspaceStandAloneConfigurationKey && !OVERRIDE_PROPERTY_REGEX.test(operation.key)) {
                if (configurationScope !== undefined && !FOLDER_SCOPES.includes(configurationScope)) {
                    throw this.toConfigurationEditingError(3 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION */, target, operation);
                }
            }
        }
        if (overrides.overrideIdentifiers?.length) {
            if (configurationScope !== 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                throw this.toConfigurationEditingError(7 /* ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION */, target, operation);
            }
        }
        if (!operation.resource) {
            throw this.toConfigurationEditingError(6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */, target, operation);
        }
        if (checkDirty && this.textFileService.isDirty(operation.resource)) {
            throw this.toConfigurationEditingError(9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */, target, operation);
        }
    }
    getConfigurationEditOperation(target, config, overrides) {
        // Check for standalone workspace configurations
        if (config.key) {
            const standaloneConfigurationMap = target === 1 /* EditableConfigurationTarget.USER_LOCAL */ ? USER_STANDALONE_CONFIGURATIONS : WORKSPACE_STANDALONE_CONFIGURATIONS;
            const standaloneConfigurationKeys = Object.keys(standaloneConfigurationMap);
            for (const key of standaloneConfigurationKeys) {
                const resource = this.getConfigurationFileResource(target, key, standaloneConfigurationMap[key], overrides.resource, undefined);
                // Check for prefix
                const keyRemainsNested = this.isWorkspaceConfigurationResource(resource) || resource?.fsPath === this.userDataProfileService.currentProfile.settingsResource.fsPath;
                if (config.key === key) {
                    const jsonPath = keyRemainsNested ? [key] : [];
                    return { key: jsonPath[jsonPath.length - 1], jsonPath, value: config.value, resource: resource ?? undefined, workspaceStandAloneConfigurationKey: key, target };
                }
                // Check for prefix.<setting>
                const keyPrefix = `${key}.`;
                if (config.key.indexOf(keyPrefix) === 0) {
                    const jsonPath = keyRemainsNested ? [key, config.key.substr(keyPrefix.length)] : [config.key.substr(keyPrefix.length)];
                    return { key: jsonPath[jsonPath.length - 1], jsonPath, value: config.value, resource: resource ?? undefined, workspaceStandAloneConfigurationKey: key, target };
                }
            }
        }
        const key = config.key;
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const configurationScope = configurationProperties[key]?.scope;
        let jsonPath = overrides.overrideIdentifiers?.length ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key] : [key];
        if (target === 1 /* EditableConfigurationTarget.USER_LOCAL */ || target === 2 /* EditableConfigurationTarget.USER_REMOTE */) {
            return { key, jsonPath, value: config.value, resource: this.getConfigurationFileResource(target, key, '', null, configurationScope) ?? undefined, target };
        }
        const resource = this.getConfigurationFileResource(target, key, FOLDER_SETTINGS_PATH, overrides.resource, configurationScope);
        if (this.isWorkspaceConfigurationResource(resource)) {
            jsonPath = ['settings', ...jsonPath];
        }
        return { key, jsonPath, value: config.value, resource: resource ?? undefined, target };
    }
    isWorkspaceConfigurationResource(resource) {
        const workspace = this.contextService.getWorkspace();
        return !!(workspace.configuration && resource && workspace.configuration.fsPath === resource.fsPath);
    }
    getConfigurationFileResource(target, key, relativePath, resource, scope) {
        if (target === 1 /* EditableConfigurationTarget.USER_LOCAL */) {
            if (key === TASKS_CONFIGURATION_KEY) {
                return this.userDataProfileService.currentProfile.tasksResource;
            }
            else {
                if (!this.userDataProfileService.currentProfile.isDefault && this.configurationService.isSettingAppliedForAllProfiles(key)) {
                    return this.userDataProfilesService.defaultProfile.settingsResource;
                }
                return this.userDataProfileService.currentProfile.settingsResource;
            }
        }
        if (target === 2 /* EditableConfigurationTarget.USER_REMOTE */) {
            return this.remoteSettingsResource;
        }
        const workbenchState = this.contextService.getWorkbenchState();
        if (workbenchState !== 1 /* WorkbenchState.EMPTY */) {
            const workspace = this.contextService.getWorkspace();
            if (target === 3 /* EditableConfigurationTarget.WORKSPACE */) {
                if (workbenchState === 3 /* WorkbenchState.WORKSPACE */) {
                    return workspace.configuration ?? null;
                }
                if (workbenchState === 2 /* WorkbenchState.FOLDER */) {
                    return workspace.folders[0].toResource(relativePath);
                }
            }
            if (target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) {
                if (resource) {
                    const folder = this.contextService.getWorkspaceFolder(resource);
                    if (folder) {
                        return folder.toResource(relativePath);
                    }
                }
            }
        }
        return null;
    }
};
ConfigurationEditing = __decorate([
    __param(1, IWorkbenchConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IFileService),
    __param(6, ITextModelService),
    __param(7, ITextFileService),
    __param(8, INotificationService),
    __param(9, IPreferencesService),
    __param(10, IEditorService),
    __param(11, IUriIdentityService),
    __param(12, IFilesConfigurationService)
], ConfigurationEditing);
export { ConfigurationEditing };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb25FZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1DQUFtQyxFQUFFLHVCQUF1QixFQUFFLHdCQUF3QixFQUFFLDhCQUE4QixFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsOEJBQThCLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzUixPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25ILE9BQU8sRUFBNEIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNwSCxPQUFPLEVBQTBCLFVBQVUsSUFBSSx1QkFBdUIsRUFBc0IsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUM1TixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0s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
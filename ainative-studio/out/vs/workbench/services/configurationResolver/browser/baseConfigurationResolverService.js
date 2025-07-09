/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Queue } from '../../../../base/common/async.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as Types from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../nls.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { VariableError, VariableKind } from '../common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../common/configurationResolverExpression.js';
import { AbstractVariableResolverService } from '../common/variableResolver.js';
const LAST_INPUT_STORAGE_KEY = 'configResolveInputLru';
const LAST_INPUT_CACHE_SIZE = 5;
export class BaseConfigurationResolverService extends AbstractVariableResolverService {
    static { this.INPUT_OR_COMMAND_VARIABLES_PATTERN = /\${((input|command):(.*?))}/g; }
    constructor(context, envVariablesPromise, editorService, configurationService, commandService, workspaceContextService, quickInputService, labelService, pathService, extensionService, storageService) {
        super({
            getFolderUri: (folderName) => {
                const folder = workspaceContextService.getWorkspace().folders.filter(f => f.name === folderName).pop();
                return folder ? folder.uri : undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceContextService.getWorkspace().folders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return configurationService.getValue(section, folderUri ? { resource: folderUri } : {});
            },
            getAppRoot: () => {
                return context.getAppRoot();
            },
            getExecPath: () => {
                return context.getExecPath();
            },
            getFilePath: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [Schemas.file, Schemas.vscodeUserData, this.pathService.defaultUriScheme]
                });
                if (!fileResource) {
                    return undefined;
                }
                return this.labelService.getUriLabel(fileResource, { noPrefix: true });
            },
            getWorkspaceFolderPathForFile: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [Schemas.file, Schemas.vscodeUserData, this.pathService.defaultUriScheme]
                });
                if (!fileResource) {
                    return undefined;
                }
                const wsFolder = workspaceContextService.getWorkspaceFolder(fileResource);
                if (!wsFolder) {
                    return undefined;
                }
                return this.labelService.getUriLabel(wsFolder.uri, { noPrefix: true });
            },
            getSelectedText: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                let activeControl = null;
                if (isCodeEditor(activeTextEditorControl)) {
                    activeControl = activeTextEditorControl;
                }
                else if (isDiffEditor(activeTextEditorControl)) {
                    const original = activeTextEditorControl.getOriginalEditor();
                    const modified = activeTextEditorControl.getModifiedEditor();
                    activeControl = original.hasWidgetFocus() ? original : modified;
                }
                const activeModel = activeControl?.getModel();
                const activeSelection = activeControl?.getSelection();
                if (activeModel && activeSelection) {
                    return activeModel.getValueInRange(activeSelection);
                }
                return undefined;
            },
            getLineNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const lineNumber = selection.positionLineNumber;
                        return String(lineNumber);
                    }
                }
                return undefined;
            },
            getColumnNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const columnNumber = selection.positionColumn;
                        return String(columnNumber);
                    }
                }
                return undefined;
            },
            getExtension: id => {
                return extensionService.getExtension(id);
            },
        }, labelService, pathService.userHome().then(home => home.path), envVariablesPromise);
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.storageService = storageService;
        this.userInputAccessQueue = new Queue();
        this.resolvableVariables.add('command');
        this.resolvableVariables.add('input');
    }
    async resolveWithInteractionReplace(folder, config, section, variables, target) {
        // First resolve any non-interactive variables and any contributed variables
        config = await this.resolveAsync(folder, config);
        // Then resolve input variables in the order in which they are encountered
        const parsed = ConfigurationResolverExpression.parse(config);
        await this.resolveWithInteraction(folder, parsed, section, variables, target);
        return parsed.toObject();
    }
    async resolveWithInteraction(folder, config, section, variableToCommandMap, target) {
        const expr = ConfigurationResolverExpression.parse(config);
        // Get values for input variables from UI
        for (const variable of expr.unresolved()) {
            let result;
            // Command
            if (variable.name === 'command') {
                const commandId = (variableToCommandMap ? variableToCommandMap[variable.arg] : undefined) || variable.arg;
                const value = await this.commandService.executeCommand(commandId, expr.toObject());
                if (!Types.isUndefinedOrNull(value)) {
                    if (typeof value !== 'string') {
                        throw new VariableError(VariableKind.Command, localize('commandVariable.noStringType', "Cannot substitute command variable '{0}' because command did not return a result of type string.", commandId));
                    }
                    result = { value };
                }
            }
            // Input
            else if (variable.name === 'input') {
                result = await this.showUserInput(section, variable.arg, await this.resolveInputs(folder, section, target), variableToCommandMap);
            }
            // Contributed variable
            else if (this._contributedVariables.has(variable.inner)) {
                result = { value: await this._contributedVariables.get(variable.inner)() };
            }
            // Not something we can handle
            else {
                continue;
            }
            if (result === undefined) {
                // Skip the entire flow if any input variable was canceled
                return undefined;
            }
            expr.resolve(variable, result);
        }
        return new Map(Iterable.map(expr.resolved(), ([key, value]) => [key.inner, value.value]));
    }
    async resolveInputs(folder, section, target) {
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ || !section) {
            return undefined;
        }
        // Look at workspace configuration
        let inputs;
        const overrides = folder ? { resource: folder.uri } : {};
        const result = this.configurationService.inspect(section, overrides);
        if (result) {
            switch (target) {
                case 8 /* ConfigurationTarget.MEMORY */:
                    inputs = result.memoryValue?.inputs;
                    break;
                case 7 /* ConfigurationTarget.DEFAULT */:
                    inputs = result.defaultValue?.inputs;
                    break;
                case 2 /* ConfigurationTarget.USER */:
                    inputs = result.userValue?.inputs;
                    break;
                case 3 /* ConfigurationTarget.USER_LOCAL */:
                    inputs = result.userLocalValue?.inputs;
                    break;
                case 4 /* ConfigurationTarget.USER_REMOTE */:
                    inputs = result.userRemoteValue?.inputs;
                    break;
                case 1 /* ConfigurationTarget.APPLICATION */:
                    inputs = result.applicationValue?.inputs;
                    break;
                case 5 /* ConfigurationTarget.WORKSPACE */:
                    inputs = result.workspaceValue?.inputs;
                    break;
                case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                default:
                    inputs = result.workspaceFolderValue?.inputs;
                    break;
            }
        }
        inputs ??= this.configurationService.getValue(section, overrides)?.inputs;
        return inputs;
    }
    readInputLru() {
        const contents = this.storageService.get(LAST_INPUT_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        const lru = new LRUCache(LAST_INPUT_CACHE_SIZE);
        try {
            if (contents) {
                lru.fromJSON(JSON.parse(contents));
            }
        }
        catch {
            // ignored
        }
        return lru;
    }
    storeInputLru(lru) {
        this.storageService.store(LAST_INPUT_STORAGE_KEY, JSON.stringify(lru.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async showUserInput(section, variable, inputInfos, variableToCommandMap) {
        if (!inputInfos) {
            throw new VariableError(VariableKind.Input, localize('inputVariable.noInputSection', "Variable '{0}' must be defined in an '{1}' section of the debug or task configuration.", variable, 'inputs'));
        }
        // Find info for the given input variable
        const info = inputInfos.filter(item => item.id === variable).pop();
        if (info) {
            const missingAttribute = (attrName) => {
                throw new VariableError(VariableKind.Input, localize('inputVariable.missingAttribute', "Input variable '{0}' is of type '{1}' and must include '{2}'.", variable, info.type, attrName));
            };
            const defaultValueMap = this.readInputLru();
            const defaultValueKey = `${section}.${variable}`;
            const previousPickedValue = defaultValueMap.get(defaultValueKey);
            switch (info.type) {
                case 'promptString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    const inputOptions = { prompt: info.description, ignoreFocusLost: true, value: variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default };
                    if (info.password) {
                        inputOptions.password = info.password;
                    }
                    return this.userInputAccessQueue.queue(() => this.quickInputService.input(inputOptions)).then(resolvedInput => {
                        if (typeof resolvedInput === 'string') {
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, resolvedInput));
                        }
                        return resolvedInput ? { value: resolvedInput, input: info } : undefined;
                    });
                }
                case 'pickString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    if (Array.isArray(info.options)) {
                        for (const pickOption of info.options) {
                            if (!Types.isString(pickOption) && !Types.isString(pickOption.value)) {
                                missingAttribute('value');
                            }
                        }
                    }
                    else {
                        missingAttribute('options');
                    }
                    const picks = new Array();
                    for (const pickOption of info.options) {
                        const value = Types.isString(pickOption) ? pickOption : pickOption.value;
                        const label = Types.isString(pickOption) ? undefined : pickOption.label;
                        const item = {
                            label: label ? `${label}: ${value}` : value,
                            value: value
                        };
                        const topValue = variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default;
                        if (value === info.default) {
                            item.description = localize('inputVariable.defaultInputValue', "(Default)");
                            picks.unshift(item);
                        }
                        else if (value === topValue) {
                            picks.unshift(item);
                        }
                        else {
                            picks.push(item);
                        }
                    }
                    const pickOptions = { placeHolder: info.description, matchOnDetail: true, ignoreFocusLost: true };
                    return this.userInputAccessQueue.queue(() => this.quickInputService.pick(picks, pickOptions, undefined)).then(resolvedInput => {
                        if (resolvedInput) {
                            const value = resolvedInput.value;
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, value));
                            return { value, input: info };
                        }
                        return undefined;
                    });
                }
                case 'command': {
                    if (!Types.isString(info.command)) {
                        missingAttribute('command');
                    }
                    return this.userInputAccessQueue.queue(() => this.commandService.executeCommand(info.command, info.args)).then(result => {
                        if (typeof result === 'string' || Types.isUndefinedOrNull(result)) {
                            return { value: result, input: info };
                        }
                        throw new VariableError(VariableKind.Input, localize('inputVariable.command.noStringType', "Cannot substitute input variable '{0}' because command '{1}' did not return a result of type string.", variable, info.command));
                    });
                }
                default:
                    throw new VariableError(VariableKind.Input, localize('inputVariable.unknownType', "Input variable '{0}' can only be of type 'promptString', 'pickString', or 'command'.", variable));
            }
        }
        throw new VariableError(VariableKind.Input, localize('inputVariable.undefinedVariable', "Undefined input variable '{0}' encountered. Remove or define '{0}' to continue.", variable));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9icm93c2VyL2Jhc2VDb25maWd1cmF0aW9uUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBRTFELE9BQU8sRUFBZSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBTzlDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBSXJGLE9BQU8sRUFBbUIsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSwrQkFBK0IsRUFBa0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVoRixNQUFNLHNCQUFzQixHQUFHLHVCQUF1QixDQUFDO0FBQ3ZELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO0FBRWhDLE1BQU0sT0FBZ0IsZ0NBQWlDLFNBQVEsK0JBQStCO2FBRTdFLHVDQUFr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
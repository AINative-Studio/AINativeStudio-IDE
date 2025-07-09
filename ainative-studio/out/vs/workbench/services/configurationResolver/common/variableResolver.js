/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as paths from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import * as process from '../../../../base/common/process.js';
import * as types from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { allVariableKinds, VariableError, VariableKind } from './configurationResolver.js';
import { ConfigurationResolverExpression } from './configurationResolverExpression.js';
export class AbstractVariableResolverService {
    constructor(_context, _labelService, _userHomePromise, _envVariablesPromise) {
        this._contributedVariables = new Map();
        this.resolvableVariables = new Set(allVariableKinds);
        this._context = _context;
        this._labelService = _labelService;
        this._userHomePromise = _userHomePromise;
        if (_envVariablesPromise) {
            this._envVariablesPromise = _envVariablesPromise.then(envVariables => {
                return this.prepareEnv(envVariables);
            });
        }
    }
    prepareEnv(envVariables) {
        // windows env variables are case insensitive
        if (isWindows) {
            const ev = Object.create(null);
            Object.keys(envVariables).forEach(key => {
                ev[key.toLowerCase()] = envVariables[key];
            });
            return ev;
        }
        return envVariables;
    }
    async resolveWithEnvironment(environment, folder, value) {
        const expr = ConfigurationResolverExpression.parse(value);
        const env = {
            env: this.prepareEnv(environment),
            userHome: undefined
        };
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(env, replacement, folder?.uri);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, resolvedValue);
            }
        }
        return expr.toObject();
    }
    async resolveAsync(folder, config) {
        const expr = ConfigurationResolverExpression.parse(config);
        const environment = {
            env: await this._envVariablesPromise,
            userHome: await this._userHomePromise
        };
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(environment, replacement, folder?.uri);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, resolvedValue);
            }
        }
        return expr.toObject();
    }
    resolveWithInteractionReplace(folder, config) {
        throw new Error('resolveWithInteractionReplace not implemented.');
    }
    resolveWithInteraction(folder, config) {
        throw new Error('resolveWithInteraction not implemented.');
    }
    contributeVariable(variable, resolution) {
        if (this._contributedVariables.has(variable)) {
            throw new Error('Variable ' + variable + ' is contributed twice.');
        }
        else {
            this.resolvableVariables.add(variable);
            this._contributedVariables.set(variable, resolution);
        }
    }
    fsPath(displayUri) {
        return this._labelService ? this._labelService.getUriLabel(displayUri, { noPrefix: true }) : displayUri.fsPath;
    }
    async evaluateSingleVariable(environment, replacement, folderUri, commandValueMapping) {
        const { name: variable, arg: argument } = replacement;
        // common error handling for all variables that require an open editor
        const getFilePath = (variableKind) => {
            const filePath = this._context.getFilePath();
            if (filePath) {
                return normalizeDriveLetter(filePath);
            }
            throw new VariableError(variableKind, (localize('canNotResolveFile', "Variable {0} can not be resolved. Please open an editor.", replacement.id)));
        };
        // common error handling for all variables that require an open editor
        const getFolderPathForFile = (variableKind) => {
            const filePath = getFilePath(variableKind); // throws error if no editor open
            if (this._context.getWorkspaceFolderPathForFile) {
                const folderPath = this._context.getWorkspaceFolderPathForFile();
                if (folderPath) {
                    return normalizeDriveLetter(folderPath);
                }
            }
            throw new VariableError(variableKind, localize('canNotResolveFolderForFile', "Variable {0}: can not find workspace folder of '{1}'.", replacement.id, paths.basename(filePath)));
        };
        // common error handling for all variables that require an open folder and accept a folder name argument
        const getFolderUri = (variableKind) => {
            if (argument) {
                const folder = this._context.getFolderUri(argument);
                if (folder) {
                    return folder;
                }
                throw new VariableError(variableKind, localize('canNotFindFolder', "Variable {0} can not be resolved. No such folder '{1}'.", variableKind, argument));
            }
            if (folderUri) {
                return folderUri;
            }
            if (this._context.getWorkspaceFolderCount() > 1) {
                throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolderMultiRoot', "Variable {0} can not be resolved in a multi folder workspace. Scope this variable using ':' and a workspace folder name.", variableKind));
            }
            throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolder', "Variable {0} can not be resolved. Please open a folder.", variableKind));
        };
        switch (variable) {
            case 'env':
                if (argument) {
                    if (environment.env) {
                        const env = environment.env[isWindows ? argument.toLowerCase() : argument];
                        if (types.isString(env)) {
                            return env;
                        }
                    }
                    return '';
                }
                throw new VariableError(VariableKind.Env, localize('missingEnvVarName', "Variable {0} can not be resolved because no environment variable name is given.", replacement.id));
            case 'config':
                if (argument) {
                    const config = this._context.getConfigurationValue(folderUri, argument);
                    if (types.isUndefinedOrNull(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNotFound', "Variable {0} can not be resolved because setting '{1}' not found.", replacement.id, argument));
                    }
                    if (types.isObject(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNoString', "Variable {0} can not be resolved because '{1}' is a structured value.", replacement.id, argument));
                    }
                    return config;
                }
                throw new VariableError(VariableKind.Config, localize('missingConfigName', "Variable {0} can not be resolved because no settings name is given.", replacement.id));
            case 'command':
                return this.resolveFromMap(VariableKind.Command, replacement.id, argument, commandValueMapping, 'command');
            case 'input':
                return this.resolveFromMap(VariableKind.Input, replacement.id, argument, commandValueMapping, 'input');
            case 'extensionInstallFolder':
                if (argument) {
                    const ext = await this._context.getExtension(argument);
                    if (!ext) {
                        throw new VariableError(VariableKind.ExtensionInstallFolder, localize('extensionNotInstalled', "Variable {0} can not be resolved because the extension {1} is not installed.", replacement.id, argument));
                    }
                    return this.fsPath(ext.extensionLocation);
                }
                throw new VariableError(VariableKind.ExtensionInstallFolder, localize('missingExtensionName', "Variable {0} can not be resolved because no extension name is given.", replacement.id));
            default: {
                switch (variable) {
                    case 'workspaceRoot':
                    case 'workspaceFolder': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolder);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'cwd': {
                        if (!folderUri && !argument) {
                            return process.cwd();
                        }
                        const uri = getFolderUri(VariableKind.Cwd);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'workspaceRootFolderName':
                    case 'workspaceFolderBasename': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolderBasename);
                        return uri ? normalizeDriveLetter(paths.basename(this.fsPath(uri))) : undefined;
                    }
                    case 'userHome':
                        if (environment.userHome) {
                            return environment.userHome;
                        }
                        throw new VariableError(VariableKind.UserHome, localize('canNotResolveUserHome', "Variable {0} can not be resolved. UserHome path is not defined", replacement.id));
                    case 'lineNumber': {
                        const lineNumber = this._context.getLineNumber();
                        if (lineNumber) {
                            return lineNumber;
                        }
                        throw new VariableError(VariableKind.LineNumber, localize('canNotResolveLineNumber', "Variable {0} can not be resolved. Make sure to have a line selected in the active editor.", replacement.id));
                    }
                    case 'columnNumber': {
                        const columnNumber = this._context.getColumnNumber();
                        if (columnNumber) {
                            return columnNumber;
                        }
                        throw new Error(localize('canNotResolveColumnNumber', "Variable {0} can not be resolved. Make sure to have a column selected in the active editor.", replacement.id));
                    }
                    case 'selectedText': {
                        const selectedText = this._context.getSelectedText();
                        if (selectedText) {
                            return selectedText;
                        }
                        throw new VariableError(VariableKind.SelectedText, localize('canNotResolveSelectedText', "Variable {0} can not be resolved. Make sure to have some text selected in the active editor.", replacement.id));
                    }
                    case 'file':
                        return getFilePath(VariableKind.File);
                    case 'fileWorkspaceFolder':
                        return getFolderPathForFile(VariableKind.FileWorkspaceFolder);
                    case 'fileWorkspaceFolderBasename':
                        return paths.basename(getFolderPathForFile(VariableKind.FileWorkspaceFolderBasename));
                    case 'relativeFile':
                        if (folderUri || argument) {
                            return paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFile)), getFilePath(VariableKind.RelativeFile));
                        }
                        return getFilePath(VariableKind.RelativeFile);
                    case 'relativeFileDirname': {
                        const dirname = paths.dirname(getFilePath(VariableKind.RelativeFileDirname));
                        if (folderUri || argument) {
                            const relative = paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFileDirname)), dirname);
                            return relative.length === 0 ? '.' : relative;
                        }
                        return dirname;
                    }
                    case 'fileDirname':
                        return paths.dirname(getFilePath(VariableKind.FileDirname));
                    case 'fileExtname':
                        return paths.extname(getFilePath(VariableKind.FileExtname));
                    case 'fileBasename':
                        return paths.basename(getFilePath(VariableKind.FileBasename));
                    case 'fileBasenameNoExtension': {
                        const basename = paths.basename(getFilePath(VariableKind.FileBasenameNoExtension));
                        return (basename.slice(0, basename.length - paths.extname(basename).length));
                    }
                    case 'fileDirnameBasename':
                        return paths.basename(paths.dirname(getFilePath(VariableKind.FileDirnameBasename)));
                    case 'execPath': {
                        const ep = this._context.getExecPath();
                        if (ep) {
                            return ep;
                        }
                        return replacement.id;
                    }
                    case 'execInstallFolder': {
                        const ar = this._context.getAppRoot();
                        if (ar) {
                            return ar;
                        }
                        return replacement.id;
                    }
                    case 'pathSeparator':
                    case '/':
                        return paths.sep;
                    default: {
                        try {
                            return this.resolveFromMap(VariableKind.Unknown, replacement.id, argument, commandValueMapping, undefined);
                        }
                        catch {
                            return replacement.id;
                        }
                    }
                }
            }
        }
    }
    resolveFromMap(variableKind, match, argument, commandValueMapping, prefix) {
        if (argument && commandValueMapping) {
            const v = (prefix === undefined) ? commandValueMapping[argument] : commandValueMapping[prefix + ':' + argument];
            if (typeof v === 'string') {
                return v;
            }
            throw new VariableError(variableKind, localize('noValueForCommand', "Variable {0} can not be resolved because the command has no value.", match));
        }
        return match;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi92YXJpYWJsZVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxLQUFLLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUF1QixTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUM7QUFFMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzlDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBaUMsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFILE9BQU8sRUFBRSwrQkFBK0IsRUFBK0IsTUFBTSxzQ0FBc0MsQ0FBQztBQWtCcEgsTUFBTSxPQUFnQiwrQkFBK0I7SUFZcEQsWUFBWSxRQUFpQyxFQUFFLGFBQTZCLEVBQUUsZ0JBQWtDLEVBQUUsb0JBQW1EO1FBSjNKLDBCQUFxQixHQUFtRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTVFLHdCQUFtQixHQUFHLElBQUksR0FBRyxDQUFTLGdCQUFnQixDQUFDLENBQUM7UUFHdkUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ3pDLElBQUksb0JBQW9CLEVB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
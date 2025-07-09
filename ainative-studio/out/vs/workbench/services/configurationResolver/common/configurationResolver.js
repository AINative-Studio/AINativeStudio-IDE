/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IConfigurationResolverService = createDecorator('configurationResolverService');
export var VariableKind;
(function (VariableKind) {
    VariableKind["Unknown"] = "unknown";
    VariableKind["Env"] = "env";
    VariableKind["Config"] = "config";
    VariableKind["Command"] = "command";
    VariableKind["Input"] = "input";
    VariableKind["ExtensionInstallFolder"] = "extensionInstallFolder";
    VariableKind["WorkspaceFolder"] = "workspaceFolder";
    VariableKind["Cwd"] = "cwd";
    VariableKind["WorkspaceFolderBasename"] = "workspaceFolderBasename";
    VariableKind["UserHome"] = "userHome";
    VariableKind["LineNumber"] = "lineNumber";
    VariableKind["ColumnNumber"] = "columnNumber";
    VariableKind["SelectedText"] = "selectedText";
    VariableKind["File"] = "file";
    VariableKind["FileWorkspaceFolder"] = "fileWorkspaceFolder";
    VariableKind["FileWorkspaceFolderBasename"] = "fileWorkspaceFolderBasename";
    VariableKind["RelativeFile"] = "relativeFile";
    VariableKind["RelativeFileDirname"] = "relativeFileDirname";
    VariableKind["FileDirname"] = "fileDirname";
    VariableKind["FileExtname"] = "fileExtname";
    VariableKind["FileBasename"] = "fileBasename";
    VariableKind["FileBasenameNoExtension"] = "fileBasenameNoExtension";
    VariableKind["FileDirnameBasename"] = "fileDirnameBasename";
    VariableKind["ExecPath"] = "execPath";
    VariableKind["ExecInstallFolder"] = "execInstallFolder";
    VariableKind["PathSeparator"] = "pathSeparator";
    VariableKind["PathSeparatorAlias"] = "/";
})(VariableKind || (VariableKind = {}));
export const allVariableKinds = Object.values(VariableKind).filter((value) => typeof value === 'string');
export class VariableError extends ErrorNoTelemetry {
    constructor(variable, message) {
        super(message);
        this.variable = variable;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvY29tbW9uL2NvbmZpZ3VyYXRpb25SZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJN0YsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUFnQyw4QkFBOEIsQ0FBQyxDQUFDO0FBK0Q1SCxNQUFNLENBQU4sSUFBWSxZQThCWDtBQTlCRCxXQUFZLFlBQVk7SUFDdkIsbUNBQW1CLENBQUE7SUFFbkIsMkJBQVcsQ0FBQTtJQUNYLGlDQUFpQixDQUFBO0lBQ2pCLG1DQUFtQixDQUFBO0lBQ25CLCtCQUFlLENBQUE7SUFDZixpRUFBaUQsQ0FBQTtJQUVqRCxtREFBbUMsQ0FBQTtJQUNuQywyQkFBVyxDQUFBO0lBQ1gsbUVBQW1ELENBQUE7SUFDbkQscUNBQXFCLENBQUE7SUFDckIseUNBQXlCLENBQUE7SUFDekIsNkNBQTZCLENBQUE7SUFDN0IsNkNBQTZCLENBQUE7SUFDN0IsNkJBQWEsQ0FBQTtJQUNiLDJEQUEyQyxDQUFBO0lBQzNDLDJFQUEyRCxDQUFBO0lBQzNELDZDQUE2QixDQUFBO0lBQzdCLDJEQUEyQyxDQUFBO0lBQzNDLDJDQUEyQixDQUFBO0lBQzNCLDJDQUEyQixDQUFBO0lBQzNCLDZDQUE2QixDQUFBO0lBQzdCLG1FQUFtRCxDQUFBO0lBQ25ELDJEQUEyQyxDQUFBO0lBQzNDLHFDQUFxQixDQUFBO0lBQ3JCLHVEQUF1QyxDQUFBO0lBQ3ZDLCtDQUErQixDQUFBO0lBQy9CLHdDQUF3QixDQUFBO0FBQ3pCLENBQUMsRUE5QlcsWUFBWSxLQUFaLFlBQVksUUE4QnZCO0FBRUQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQXlCLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQztBQUVoSSxNQUFNLE9BQU8sYUFBYyxTQUFRLGdCQUFnQjtJQUNsRCxZQUE0QixRQUFzQixFQUFFLE9BQWdCO1FBQ25FLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQURZLGFBQVEsR0FBUixRQUFRLENBQWM7SUFFbEQsQ0FBQztDQUNEIn0=
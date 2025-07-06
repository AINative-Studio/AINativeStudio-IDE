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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL2NvbW1vbi9jb25maWd1cmF0aW9uUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSTdGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsOEJBQThCLENBQUMsQ0FBQztBQStENUgsTUFBTSxDQUFOLElBQVksWUE4Qlg7QUE5QkQsV0FBWSxZQUFZO0lBQ3ZCLG1DQUFtQixDQUFBO0lBRW5CLDJCQUFXLENBQUE7SUFDWCxpQ0FBaUIsQ0FBQTtJQUNqQixtQ0FBbUIsQ0FBQTtJQUNuQiwrQkFBZSxDQUFBO0lBQ2YsaUVBQWlELENBQUE7SUFFakQsbURBQW1DLENBQUE7SUFDbkMsMkJBQVcsQ0FBQTtJQUNYLG1FQUFtRCxDQUFBO0lBQ25ELHFDQUFxQixDQUFBO0lBQ3JCLHlDQUF5QixDQUFBO0lBQ3pCLDZDQUE2QixDQUFBO0lBQzdCLDZDQUE2QixDQUFBO0lBQzdCLDZCQUFhLENBQUE7SUFDYiwyREFBMkMsQ0FBQTtJQUMzQywyRUFBMkQsQ0FBQTtJQUMzRCw2Q0FBNkIsQ0FBQTtJQUM3QiwyREFBMkMsQ0FBQTtJQUMzQywyQ0FBMkIsQ0FBQTtJQUMzQiwyQ0FBMkIsQ0FBQTtJQUMzQiw2Q0FBNkIsQ0FBQTtJQUM3QixtRUFBbUQsQ0FBQTtJQUNuRCwyREFBMkMsQ0FBQTtJQUMzQyxxQ0FBcUIsQ0FBQTtJQUNyQix1REFBdUMsQ0FBQTtJQUN2QywrQ0FBK0IsQ0FBQTtJQUMvQix3Q0FBd0IsQ0FBQTtBQUN6QixDQUFDLEVBOUJXLFlBQVksS0FBWixZQUFZLFFBOEJ2QjtBQUVELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUF5QixFQUFFLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUM7QUFFaEksTUFBTSxPQUFPLGFBQWMsU0FBUSxnQkFBZ0I7SUFDbEQsWUFBNEIsUUFBc0IsRUFBRSxPQUFnQjtRQUNuRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFEWSxhQUFRLEdBQVIsUUFBUSxDQUFjO0lBRWxELENBQUM7Q0FDRCJ9
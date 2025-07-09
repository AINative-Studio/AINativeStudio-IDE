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
import { Lazy } from '../../../base/common/lazy.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import * as process from '../../../base/common/process.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { CustomEditorTabInput, NotebookDiffEditorTabInput, NotebookEditorTabInput, TextDiffTabInput, TextTabInput } from './extHostTypes.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { AbstractVariableResolverService } from '../../services/configurationResolver/common/variableResolver.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
export const IExtHostVariableResolverProvider = createDecorator('IExtHostVariableResolverProvider');
class ExtHostVariableResolverService extends AbstractVariableResolverService {
    constructor(extensionService, workspaceService, editorService, editorTabs, configProvider, context, homeDir) {
        function getActiveUri() {
            if (editorService) {
                const activeEditor = editorService.activeEditor();
                if (activeEditor) {
                    return activeEditor.document.uri;
                }
                const activeTab = editorTabs.tabGroups.all.find(group => group.isActive)?.activeTab;
                if (activeTab !== undefined) {
                    // Resolve a resource from the tab
                    if (activeTab.input instanceof TextDiffTabInput || activeTab.input instanceof NotebookDiffEditorTabInput) {
                        return activeTab.input.modified;
                    }
                    else if (activeTab.input instanceof TextTabInput || activeTab.input instanceof NotebookEditorTabInput || activeTab.input instanceof CustomEditorTabInput) {
                        return activeTab.input.uri;
                    }
                }
            }
            return undefined;
        }
        super({
            getFolderUri: (folderName) => {
                const found = context.folders.filter(f => f.name === folderName);
                if (found && found.length > 0) {
                    return found[0].uri;
                }
                return undefined;
            },
            getWorkspaceFolderCount: () => {
                return context.folders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return configProvider.getConfiguration(undefined, folderUri).get(section);
            },
            getAppRoot: () => {
                return process.cwd();
            },
            getExecPath: () => {
                return process.env['VSCODE_EXEC_PATH'];
            },
            getFilePath: () => {
                const activeUri = getActiveUri();
                if (activeUri) {
                    return path.normalize(activeUri.fsPath);
                }
                return undefined;
            },
            getWorkspaceFolderPathForFile: () => {
                if (workspaceService) {
                    const activeUri = getActiveUri();
                    if (activeUri) {
                        const ws = workspaceService.getWorkspaceFolder(activeUri);
                        if (ws) {
                            return path.normalize(ws.uri.fsPath);
                        }
                    }
                }
                return undefined;
            },
            getSelectedText: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor && !activeEditor.selection.isEmpty) {
                        return activeEditor.document.getText(activeEditor.selection);
                    }
                }
                return undefined;
            },
            getLineNumber: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor) {
                        return String(activeEditor.selection.end.line + 1);
                    }
                }
                return undefined;
            },
            getColumnNumber: () => {
                if (editorService) {
                    const activeEditor = editorService.activeEditor();
                    if (activeEditor) {
                        return String(activeEditor.selection.end.character + 1);
                    }
                }
                return undefined;
            },
            getExtension: (id) => {
                return extensionService.getExtension(id);
            },
        }, undefined, homeDir ? Promise.resolve(homeDir) : undefined, Promise.resolve(process.env));
    }
}
let ExtHostVariableResolverProviderService = class ExtHostVariableResolverProviderService extends Disposable {
    constructor(extensionService, workspaceService, editorService, configurationService, editorTabs) {
        super();
        this.extensionService = extensionService;
        this.workspaceService = workspaceService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.editorTabs = editorTabs;
        this._resolver = new Lazy(async () => {
            const configProvider = await this.configurationService.getConfigProvider();
            const folders = await this.workspaceService.getWorkspaceFolders2() || [];
            const dynamic = { folders };
            this._register(this.workspaceService.onDidChangeWorkspace(async (e) => {
                dynamic.folders = await this.workspaceService.getWorkspaceFolders2() || [];
            }));
            return new ExtHostVariableResolverService(this.extensionService, this.workspaceService, this.editorService, this.editorTabs, configProvider, dynamic, this.homeDir());
        });
    }
    getResolver() {
        return this._resolver.value;
    }
    homeDir() {
        return undefined;
    }
};
ExtHostVariableResolverProviderService = __decorate([
    __param(0, IExtHostExtensionService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostDocumentsAndEditors),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostEditorTabs)
], ExtHostVariableResolverProviderService);
export { ExtHostVariableResolverProviderService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RWYXJpYWJsZVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBRWxILE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQU96RixNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQW1DLGtDQUFrQyxDQUFDLENBQUM7QUFNdEksTUFBTSw4QkFBK0Is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
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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { FilePermission, FileSystemProviderErrorCode, FileType } from '../../../../platform/files/common/files.js';
import { ChangeType, decodeEditSessionFileContent, EDIT_SESSIONS_SCHEME, IEditSessionsStorageService } from '../common/editSessions.js';
import { NotSupportedError } from '../../../../base/common/errors.js';
let EditSessionsFileSystemProvider = class EditSessionsFileSystemProvider {
    static { this.SCHEMA = EDIT_SESSIONS_SCHEME; }
    constructor(editSessionsStorageService) {
        this.editSessionsStorageService = editSessionsStorageService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ + 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        //#region Unsupported file operations
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    async readFile(resource) {
        const match = /(?<ref>[^/]+)\/(?<folderName>[^/]+)\/(?<filePath>.*)/.exec(resource.path.substring(1));
        if (!match?.groups) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        const { ref, folderName, filePath } = match.groups;
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        const content = JSON.parse(data.content);
        const change = content.folders.find((f) => f.name === folderName)?.workingChanges.find((change) => change.relativeFilePath === filePath);
        if (!change || change.type === ChangeType.Deletion) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        return decodeEditSessionFileContent(content.version, change.contents).buffer;
    }
    async stat(resource) {
        const content = await this.readFile(resource);
        const currentTime = Date.now();
        return {
            type: FileType.File,
            permissions: FilePermission.Readonly,
            mtime: currentTime,
            ctime: currentTime,
            size: content.byteLength
        };
    }
    watch(resource, opts) { return Disposable.None; }
    async mkdir(resource) { }
    async readdir(resource) { return []; }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    async writeFile() {
        throw new NotSupportedError();
    }
};
EditSessionsFileSystemProvider = __decorate([
    __param(0, IEditSessionsStorageService)
], EditSessionsFileSystemProvider);
export { EditSessionsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9icm93c2VyL2VkaXRTZXNzaW9uc0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxjQUFjLEVBQWtDLDJCQUEyQixFQUFFLFFBQVEsRUFBbUgsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwUSxPQUFPLEVBQUUsVUFBVSxFQUFFLDRCQUE0QixFQUFFLG9CQUFvQixFQUFlLDJCQUEyQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7YUFFMUIsV0FBTSxHQUFHLG9CQUFvQixBQUF2QixDQUF3QjtJQUU5QyxZQUM4QiwwQkFBK0Q7UUFBdkQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUdwRixpQkFBWSxHQUFtQyx5R0FBc0YsQ0FBQztRQWdDL0kscUNBQXFDO1FBQzVCLDRCQUF1QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDckMsb0JBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBcENsQyxDQUFDO0lBSUwsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhO1FBQzNCLE1BQU0sS0FBSyxHQUFHLHNEQUFzRCxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMs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
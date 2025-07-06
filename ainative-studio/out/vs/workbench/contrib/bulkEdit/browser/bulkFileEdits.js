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
var RenameOperation_1;
import { IFileService } from '../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkingCopyFileService } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
class Noop {
    constructor() {
        this.uris = [];
    }
    async perform() { return this; }
    toString() {
        return '(noop)';
    }
}
class RenameEdit {
    constructor(newUri, oldUri, options) {
        this.newUri = newUri;
        this.oldUri = oldUri;
        this.options = options;
        this.type = 'rename';
    }
}
let RenameOperation = RenameOperation_1 = class RenameOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
    }
    get uris() {
        return this._edits.flatMap(edit => [edit.newUri, edit.oldUri]);
    }
    async perform(token) {
        const moves = [];
        const undoes = [];
        for (const edit of this._edits) {
            // check: not overwriting, but ignoring, and the target file exists
            const skip = edit.options.overwrite === undefined && edit.options.ignoreIfExists && await this._fileService.exists(edit.newUri);
            if (!skip) {
                moves.push({
                    file: { source: edit.oldUri, target: edit.newUri },
                    overwrite: edit.options.overwrite
                });
                // reverse edit
                undoes.push(new RenameEdit(edit.oldUri, edit.newUri, edit.options));
            }
        }
        if (moves.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.move(moves, token, this._undoRedoInfo);
        return new RenameOperation_1(undoes, { isUndoing: true }, this._workingCopyFileService, this._fileService);
    }
    toString() {
        return `(rename ${this._edits.map(edit => `${edit.oldUri} to ${edit.newUri}`).join(', ')})`;
    }
};
RenameOperation = RenameOperation_1 = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService)
], RenameOperation);
class CopyEdit {
    constructor(newUri, oldUri, options) {
        this.newUri = newUri;
        this.oldUri = oldUri;
        this.options = options;
        this.type = 'copy';
    }
}
let CopyOperation = class CopyOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService, _instaService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
        this._instaService = _instaService;
    }
    get uris() {
        return this._edits.flatMap(edit => [edit.newUri, edit.oldUri]);
    }
    async perform(token) {
        // (1) create copy operations, remove noops
        const copies = [];
        for (const edit of this._edits) {
            //check: not overwriting, but ignoring, and the target file exists
            const skip = edit.options.overwrite === undefined && edit.options.ignoreIfExists && await this._fileService.exists(edit.newUri);
            if (!skip) {
                copies.push({ file: { source: edit.oldUri, target: edit.newUri }, overwrite: edit.options.overwrite });
            }
        }
        if (copies.length === 0) {
            return new Noop();
        }
        // (2) perform the actual copy and use the return stats to build undo edits
        const stats = await this._workingCopyFileService.copy(copies, token, this._undoRedoInfo);
        const undoes = [];
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const edit = this._edits[i];
            undoes.push(new DeleteEdit(stat.resource, { recursive: true, folder: this._edits[i].options.folder || stat.isDirectory, ...edit.options }, false));
        }
        return this._instaService.createInstance(DeleteOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(copy ${this._edits.map(edit => `${edit.oldUri} to ${edit.newUri}`).join(', ')})`;
    }
};
CopyOperation = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService),
    __param(4, IInstantiationService)
], CopyOperation);
class CreateEdit {
    constructor(newUri, options, contents) {
        this.newUri = newUri;
        this.options = options;
        this.contents = contents;
        this.type = 'create';
    }
}
let CreateOperation = class CreateOperation {
    constructor(_edits, _undoRedoInfo, _fileService, _workingCopyFileService, _instaService, _textFileService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._fileService = _fileService;
        this._workingCopyFileService = _workingCopyFileService;
        this._instaService = _instaService;
        this._textFileService = _textFileService;
    }
    get uris() {
        return this._edits.map(edit => edit.newUri);
    }
    async perform(token) {
        const folderCreates = [];
        const fileCreates = [];
        const undoes = [];
        for (const edit of this._edits) {
            if (edit.newUri.scheme === Schemas.untitled) {
                continue; // ignore, will be handled by a later edit
            }
            if (edit.options.overwrite === undefined && edit.options.ignoreIfExists && await this._fileService.exists(edit.newUri)) {
                continue; // not overwriting, but ignoring, and the target file exists
            }
            if (edit.options.folder) {
                folderCreates.push({ resource: edit.newUri });
            }
            else {
                // If the contents are part of the edit they include the encoding, thus use them. Otherwise get the encoding for a new empty file.
                const encodedReadable = typeof edit.contents !== 'undefined' ? edit.contents : await this._textFileService.getEncodedReadable(edit.newUri);
                fileCreates.push({ resource: edit.newUri, contents: encodedReadable, overwrite: edit.options.overwrite });
            }
            undoes.push(new DeleteEdit(edit.newUri, edit.options, !edit.options.folder && !edit.contents));
        }
        if (folderCreates.length === 0 && fileCreates.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.createFolder(folderCreates, token, this._undoRedoInfo);
        await this._workingCopyFileService.create(fileCreates, token, this._undoRedoInfo);
        return this._instaService.createInstance(DeleteOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(create ${this._edits.map(edit => edit.options.folder ? `folder ${edit.newUri}` : `file ${edit.newUri} with ${edit.contents?.byteLength || 0} bytes`).join(', ')})`;
    }
};
CreateOperation = __decorate([
    __param(2, IFileService),
    __param(3, IWorkingCopyFileService),
    __param(4, IInstantiationService),
    __param(5, ITextFileService)
], CreateOperation);
class DeleteEdit {
    constructor(oldUri, options, undoesCreate) {
        this.oldUri = oldUri;
        this.options = options;
        this.undoesCreate = undoesCreate;
        this.type = 'delete';
    }
}
let DeleteOperation = class DeleteOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService, _configurationService, _instaService, _logService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
        this._configurationService = _configurationService;
        this._instaService = _instaService;
        this._logService = _logService;
    }
    get uris() {
        return this._edits.map(edit => edit.oldUri);
    }
    async perform(token) {
        // delete file
        const deletes = [];
        const undoes = [];
        for (const edit of this._edits) {
            let fileStat;
            try {
                fileStat = await this._fileService.resolve(edit.oldUri, { resolveMetadata: true });
            }
            catch (err) {
                if (!edit.options.ignoreIfNotExists) {
                    throw new Error(`${edit.oldUri} does not exist and can not be deleted`);
                }
                continue;
            }
            deletes.push({
                resource: edit.oldUri,
                recursive: edit.options.recursive,
                useTrash: !edit.options.skipTrashBin && this._fileService.hasCapability(edit.oldUri, 4096 /* FileSystemProviderCapabilities.Trash */) && this._configurationService.getValue('files.enableTrash')
            });
            // read file contents for undo operation. when a file is too large it won't be restored
            let fileContent;
            let fileContentExceedsMaxSize = false;
            if (!edit.undoesCreate && !edit.options.folder) {
                fileContentExceedsMaxSize = typeof edit.options.maxSize === 'number' && fileStat.size > edit.options.maxSize;
                if (!fileContentExceedsMaxSize) {
                    try {
                        fileContent = await this._fileService.readFile(edit.oldUri);
                    }
                    catch (err) {
                        this._logService.error(err);
                    }
                }
            }
            if (!fileContentExceedsMaxSize) {
                undoes.push(new CreateEdit(edit.oldUri, edit.options, fileContent?.value));
            }
        }
        if (deletes.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.delete(deletes, token, this._undoRedoInfo);
        if (undoes.length === 0) {
            return new Noop();
        }
        return this._instaService.createInstance(CreateOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(delete ${this._edits.map(edit => edit.oldUri).join(', ')})`;
    }
};
DeleteOperation = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, ILogService)
], DeleteOperation);
class FileUndoRedoElement {
    constructor(label, code, operations, confirmBeforeUndo) {
        this.label = label;
        this.code = code;
        this.operations = operations;
        this.confirmBeforeUndo = confirmBeforeUndo;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this.resources = operations.flatMap(op => op.uris);
    }
    async undo() {
        await this._reverse();
    }
    async redo() {
        await this._reverse();
    }
    async _reverse() {
        for (let i = 0; i < this.operations.length; i++) {
            const op = this.operations[i];
            const undo = await op.perform(CancellationToken.None);
            this.operations[i] = undo;
        }
    }
    toString() {
        return this.operations.map(op => String(op)).join(', ');
    }
}
let BulkFileEdits = class BulkFileEdits {
    constructor(_label, _code, _undoRedoGroup, _undoRedoSource, _confirmBeforeUndo, _progress, _token, _edits, _instaService, _undoRedoService) {
        this._label = _label;
        this._code = _code;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._confirmBeforeUndo = _confirmBeforeUndo;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._instaService = _instaService;
        this._undoRedoService = _undoRedoService;
    }
    async apply() {
        const undoOperations = [];
        const undoRedoInfo = { undoRedoGroupId: this._undoRedoGroup.id };
        const edits = [];
        for (const edit of this._edits) {
            if (edit.newResource && edit.oldResource && !edit.options?.copy) {
                edits.push(new RenameEdit(edit.newResource, edit.oldResource, edit.options ?? {}));
            }
            else if (edit.newResource && edit.oldResource && edit.options?.copy) {
                edits.push(new CopyEdit(edit.newResource, edit.oldResource, edit.options ?? {}));
            }
            else if (!edit.newResource && edit.oldResource) {
                edits.push(new DeleteEdit(edit.oldResource, edit.options ?? {}, false));
            }
            else if (edit.newResource && !edit.oldResource) {
                edits.push(new CreateEdit(edit.newResource, edit.options ?? {}, await edit.options.contents));
            }
        }
        if (edits.length === 0) {
            return [];
        }
        const groups = [];
        groups[0] = [edits[0]];
        for (let i = 1; i < edits.length; i++) {
            const edit = edits[i];
            const lastGroup = groups.at(-1);
            if (lastGroup?.[0].type === edit.type) {
                lastGroup.push(edit);
            }
            else {
                groups.push([edit]);
            }
        }
        for (const group of groups) {
            if (this._token.isCancellationRequested) {
                break;
            }
            let op;
            switch (group[0].type) {
                case 'rename':
                    op = this._instaService.createInstance(RenameOperation, group, undoRedoInfo);
                    break;
                case 'copy':
                    op = this._instaService.createInstance(CopyOperation, group, undoRedoInfo);
                    break;
                case 'delete':
                    op = this._instaService.createInstance(DeleteOperation, group, undoRedoInfo);
                    break;
                case 'create':
                    op = this._instaService.createInstance(CreateOperation, group, undoRedoInfo);
                    break;
            }
            if (op) {
                const undoOp = await op.perform(this._token);
                undoOperations.push(undoOp);
            }
            this._progress.report(undefined);
        }
        const undoRedoElement = new FileUndoRedoElement(this._label, this._code, undoOperations, this._confirmBeforeUndo);
        this._undoRedoService.pushElement(undoRedoElement, this._undoRedoGroup, this._undoRedoSource);
        return undoRedoElement.resources;
    }
};
BulkFileEdits = __decorate([
    __param(8, IInstantiationService),
    __param(9, IUndoRedoService)
], BulkFileEdits);
export { BulkFileEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0ZpbGVFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9idWxrRmlsZUVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsWUFBWSxFQUF1RSxNQUFNLDRDQUE0QyxDQUFDO0FBRS9JLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBd0gsTUFBTSxnRUFBZ0UsQ0FBQztBQUMvTixPQUFPLEVBQWtELGdCQUFnQixFQUFpQyxNQUFNLGtEQUFrRCxDQUFDO0FBRW5LLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUdyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFPN0QsTUFBTSxJQUFJO0lBQVY7UUFDVSxTQUFJLEdBQUcsRUFBRSxDQUFDO0lBS3BCLENBQUM7SUFKQSxLQUFLLENBQUMsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoQyxRQUFRO1FBQ1AsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVO0lBRWYsWUFDVSxNQUFXLEVBQ1gsTUFBVyxFQUNYLE9BQWlDO1FBRmpDLFdBQU0sR0FBTixNQUFNLENBQUs7UUFDWCxXQUFNLEdBQU4sTUFBTSxDQUFLO1FB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
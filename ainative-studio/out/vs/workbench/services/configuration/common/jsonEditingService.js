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
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IJSONEditingService, JSONEditingError } from './jsonEditing.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
let JSONEditingService = class JSONEditingService {
    constructor(fileService, textModelResolverService, textFileService, filesConfigurationService) {
        this.fileService = fileService;
        this.textModelResolverService = textModelResolverService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.queue = new Queue();
    }
    write(resource, values) {
        return Promise.resolve(this.queue.queue(() => this.doWriteConfiguration(resource, values))); // queue up writes to prevent race conditions
    }
    async doWriteConfiguration(resource, values) {
        const reference = await this.resolveAndValidate(resource, true);
        try {
            await this.writeToBuffer(reference.object.textEditorModel, values);
        }
        finally {
            reference.dispose();
        }
    }
    async writeToBuffer(model, values) {
        let disposable;
        try {
            // Optimization: we apply edits to a text model and save it
            // right after. Use the files config service to signal this
            // to the workbench to optimise the UI during this operation.
            // For example, avoids to briefly show dirty indicators.
            disposable = this.filesConfigurationService.enableAutoSaveAfterShortDelay(model.uri);
            let hasEdits = false;
            for (const value of values) {
                const edit = this.getEdits(model, value)[0];
                hasEdits = (!!edit && this.applyEditsToBuffer(edit, model)) || hasEdits;
            }
            if (hasEdits) {
                return this.textFileService.save(model.uri);
            }
        }
        finally {
            disposable?.dispose();
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
    getEdits(model, configurationValue) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        const { path, value } = configurationValue;
        // With empty path the entire file is being replaced, so we just use JSON.stringify
        if (!path.length) {
            const content = JSON.stringify(value, null, insertSpaces ? ' '.repeat(tabSize) : '\t');
            return [{
                    content,
                    length: content.length,
                    offset: 0
                }];
        }
        return setProperty(model.getValue(), path, value, { tabSize, insertSpaces, eol });
    }
    async resolveModelReference(resource) {
        const exists = await this.fileService.exists(resource);
        if (!exists) {
            await this.textFileService.write(resource, '{}', { encoding: 'utf8' });
        }
        return this.textModelResolverService.createModelReference(resource);
    }
    hasParseErrors(model) {
        const parseErrors = [];
        json.parse(model.getValue(), parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        return parseErrors.length > 0;
    }
    async resolveAndValidate(resource, checkDirty) {
        const reference = await this.resolveModelReference(resource);
        const model = reference.object.textEditorModel;
        if (this.hasParseErrors(model)) {
            reference.dispose();
            return this.reject(0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */);
        }
        return reference;
    }
    reject(code) {
        const message = this.toErrorMessage(code);
        return Promise.reject(new JSONEditingError(message, code));
    }
    toErrorMessage(error) {
        switch (error) {
            // User issues
            case 0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */: {
                return nls.localize('errorInvalidFile', "Unable to write into the file. Please open the file to correct errors/warnings in the file and try again.");
            }
        }
    }
};
JSONEditingService = __decorate([
    __param(0, IFileService),
    __param(1, ITextModelService),
    __param(2, ITextFileService),
    __param(3, IFilesConfigurationService)
], JSONEditingService);
export { JSONEditingService };
registerSingleton(IJSONEditingService, JSONEditingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2NvbW1vbi9qc29uRWRpdGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBNEIsTUFBTSx1REFBdUQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsbUJBQW1CLEVBQWMsZ0JBQWdCLEVBQXdCLE1BQU0sa0JBQWtCLENBQUM7QUFFM0csT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRW5HLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBTTlCLFlBQ2dDLFdBQXlCLEVBQ3BCLHdCQUEyQyxFQUM1QyxlQUFp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
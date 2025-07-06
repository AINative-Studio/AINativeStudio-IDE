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
var UntitledTextEditorModel_1;
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Emitter } from '../../../../base/common/event.js';
import { IWorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackup.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { createTextBufferFactory, createTextBufferFactoryFromStream } from '../../../../editor/common/model/textModel.js';
import { IWorkingCopyService } from '../../workingCopy/common/workingCopyService.js';
import { NO_TYPE_ID } from '../../workingCopy/common/workingCopy.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ensureValidWordDefinition } from '../../../../editor/common/core/wordHelper.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { getCharContainingOffset } from '../../../../base/common/strings.js';
import { UTF8 } from '../../textfile/common/encoding.js';
import { bufferToReadable, bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { ILanguageDetectionService } from '../../languageDetection/common/languageDetectionWorkerService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
let UntitledTextEditorModel = class UntitledTextEditorModel extends BaseTextEditorModel {
    static { UntitledTextEditorModel_1 = this; }
    static { this.FIRST_LINE_NAME_MAX_LENGTH = 40; }
    static { this.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH = this.FIRST_LINE_NAME_MAX_LENGTH * 10; }
    // Support the special '${activeEditorLanguage}' language by
    // looking up the language id from the editor that is active
    // before the untitled editor opens. This special id is only
    // used for the initial language and can be changed after the
    // fact (either manually or through auto-detection).
    static { this.ACTIVE_EDITOR_LANGUAGE_ID = '${activeEditorLanguage}'; }
    get name() {
        // Take name from first line if present and only if
        // we have no associated file path. In that case we
        // prefer the file name as title.
        if (this.configuredLabelFormat === 'content' && !this.hasAssociatedFilePath && this.cachedModelFirstLineWords) {
            return this.cachedModelFirstLineWords;
        }
        // Otherwise fallback to resource
        return this.labelService.getUriBasenameLabel(this.resource);
    }
    //#endregion
    constructor(resource, hasAssociatedFilePath, initialValue, preferredLanguageId, preferredEncoding, languageService, modelService, workingCopyBackupService, textResourceConfigurationService, workingCopyService, textFileService, labelService, editorService, languageDetectionService, accessibilityService) {
        super(modelService, languageService, languageDetectionService, accessibilityService);
        this.resource = resource;
        this.hasAssociatedFilePath = hasAssociatedFilePath;
        this.initialValue = initialValue;
        this.preferredLanguageId = preferredLanguageId;
        this.preferredEncoding = preferredEncoding;
        this.workingCopyBackupService = workingCopyBackupService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.workingCopyService = workingCopyService;
        this.textFileService = textFileService;
        this.labelService = labelService;
        this.editorService = editorService;
        //#region Events
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeName = this._register(new Emitter());
        this.onDidChangeName = this._onDidChangeName.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        //#endregion
        this.typeId = NO_TYPE_ID; // IMPORTANT: never change this to not break existing assumptions (e.g. backups)
        this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */;
        //#region Name
        this.configuredLabelFormat = 'content';
        this.cachedModelFirstLineWords = undefined;
        //#endregion
        //#region Resolve
        this.ignoreDirtyOnModelContentChange = false;
        this.dirty = this.hasAssociatedFilePath || !!this.initialValue;
        // Make known to working copy service
        this._register(this.workingCopyService.registerWorkingCopy(this));
        // This is typically controlled by the setting `files.defaultLanguage`.
        // If that setting is set, we should not detect the language.
        if (preferredLanguageId) {
            this.setLanguageId(preferredLanguageId);
        }
        // Fetch config
        this.onConfigurationChange(undefined, false);
        this.registerListeners();
    }
    registerListeners() {
        // Config Changes
        this._register(this.textResourceConfigurationService.onDidChangeConfiguration(e => this.onConfigurationChange(e, true)));
    }
    onConfigurationChange(e, fromEvent) {
        // Encoding
        if (!e || e.affectsConfiguration(this.resource, 'files.encoding')) {
            const configuredEncoding = this.textResourceConfigurationService.getValue(this.resource, 'files.encoding');
            if (this.configuredEncoding !== configuredEncoding && typeof configuredEncoding === 'string') {
                this.configuredEncoding = configuredEncoding;
                if (fromEvent && !this.preferredEncoding) {
                    this._onDidChangeEncoding.fire(); // do not fire event if we have a preferred encoding set
                }
            }
        }
        // Label Format
        if (!e || e.affectsConfiguration(this.resource, 'workbench.editor.untitled.labelFormat')) {
            const configuredLabelFormat = this.textResourceConfigurationService.getValue(this.resource, 'workbench.editor.untitled.labelFormat');
            if (this.configuredLabelFormat !== configuredLabelFormat && (configuredLabelFormat === 'content' || configuredLabelFormat === 'name')) {
                this.configuredLabelFormat = configuredLabelFormat;
                if (fromEvent) {
                    this._onDidChangeName.fire();
                }
            }
        }
    }
    //#region Language
    setLanguageId(languageId, source) {
        const actualLanguage = languageId === UntitledTextEditorModel_1.ACTIVE_EDITOR_LANGUAGE_ID
            ? this.editorService.activeTextEditorLanguageId
            : languageId;
        this.preferredLanguageId = actualLanguage;
        if (actualLanguage) {
            super.setLanguageId(actualLanguage, source);
        }
    }
    getLanguageId() {
        if (this.textEditorModel) {
            return this.textEditorModel.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    getEncoding() {
        return this.preferredEncoding || this.configuredEncoding;
    }
    async setEncoding(encoding) {
        const oldEncoding = this.getEncoding();
        this.preferredEncoding = encoding;
        // Emit if it changed
        if (oldEncoding !== this.preferredEncoding) {
            this._onDidChangeEncoding.fire();
        }
    }
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    setDirty(dirty) {
        if (this.dirty === dirty) {
            return;
        }
        this.dirty = dirty;
        this._onDidChangeDirty.fire();
    }
    //#endregion
    //#region Save / Revert / Backup
    async save(options) {
        const target = await this.textFileService.save(this.resource, options);
        // Emit as event
        if (target) {
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
        }
        return !!target;
    }
    async revert() {
        // Reset contents to be empty
        this.ignoreDirtyOnModelContentChange = true;
        try {
            this.updateTextEditorModel(createTextBufferFactory(''));
        }
        finally {
            this.ignoreDirtyOnModelContentChange = false;
        }
        // No longer dirty
        this.setDirty(false);
        // Emit as event
        this._onDidRevert.fire();
    }
    async backup(token) {
        let content = undefined;
        // Make sure to check whether this model has been resolved
        // or not and fallback to the initial value - if any - to
        // prevent backing up an unresolved model and loosing the
        // initial value.
        if (this.isResolved()) {
            // Fill in content the same way we would do when saving the file
            // via the text file service encoding support (hardcode UTF-8)
            content = await this.textFileService.getEncodedReadable(this.resource, this.createSnapshot() ?? undefined, { encoding: UTF8 });
        }
        else if (typeof this.initialValue === 'string') {
            content = bufferToReadable(VSBuffer.fromString(this.initialValue));
        }
        return { content };
    }
    async resolve() {
        // Create text editor model if not yet done
        let createdUntitledModel = false;
        let hasBackup = false;
        if (!this.textEditorModel) {
            let untitledContents;
            // Check for backups or use initial value or empty
            const backup = await this.workingCopyBackupService.resolve(this);
            if (backup) {
                untitledContents = backup.value;
                hasBackup = true;
            }
            else {
                untitledContents = bufferToStream(VSBuffer.fromString(this.initialValue || ''));
            }
            // Determine untitled contents based on backup
            // or initial value. We must use text file service
            // to create the text factory to respect encodings
            // accordingly.
            const untitledContentsFactory = await createTextBufferFactoryFromStream(await this.textFileService.getDecodedStream(this.resource, untitledContents, { encoding: UTF8 }));
            this.createTextEditorModel(untitledContentsFactory, this.resource, this.preferredLanguageId);
            createdUntitledModel = true;
        }
        // Otherwise: the untitled model already exists and we must assume
        // that the value of the model was changed by the user. As such we
        // do not update the contents, only the language if configured.
        else {
            this.updateTextEditorModel(undefined, this.preferredLanguageId);
        }
        // Listen to text model events
        const textEditorModel = assertIsDefined(this.textEditorModel);
        this.installModelListeners(textEditorModel);
        // Only adjust name and dirty state etc. if we
        // actually created the untitled model
        if (createdUntitledModel) {
            // Name
            if (hasBackup || this.initialValue) {
                this.updateNameFromFirstLine(textEditorModel);
            }
            // Untitled associated to file path are dirty right away as well as untitled with content
            this.setDirty(this.hasAssociatedFilePath || !!hasBackup || !!this.initialValue);
            // If we have initial contents, make sure to emit this
            // as the appropiate events to the outside.
            if (hasBackup || this.initialValue) {
                this._onDidChangeContent.fire();
            }
        }
        return super.resolve();
    }
    installModelListeners(model) {
        this._register(model.onDidChangeContent(e => this.onModelContentChanged(model, e)));
        this._register(model.onDidChangeLanguage(() => this.onConfigurationChange(undefined, true))); // language change can have impact on config
        super.installModelListeners(model);
    }
    onModelContentChanged(textEditorModel, e) {
        if (!this.ignoreDirtyOnModelContentChange) {
            // mark the untitled text editor as non-dirty once its content becomes empty and we do
            // not have an associated path set. we never want dirty indicator in that case.
            if (!this.hasAssociatedFilePath && textEditorModel.getLineCount() === 1 && textEditorModel.getLineLength(1) === 0) {
                this.setDirty(false);
            }
            // turn dirty otherwise
            else {
                this.setDirty(true);
            }
        }
        // Check for name change if first line changed in the range of 0-FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH columns
        if (e.changes.some(change => (change.range.startLineNumber === 1 || change.range.endLineNumber === 1) && change.range.startColumn <= UntitledTextEditorModel_1.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH)) {
            this.updateNameFromFirstLine(textEditorModel);
        }
        // Emit as general content change event
        this._onDidChangeContent.fire();
        // Detect language from content
        this.autoDetectLanguage();
    }
    updateNameFromFirstLine(textEditorModel) {
        if (this.hasAssociatedFilePath) {
            return; // not in case of an associated file path
        }
        // Determine the first words of the model following these rules:
        // - cannot be only whitespace (so we trim())
        // - cannot be only non-alphanumeric characters (so we run word definition regex over it)
        // - cannot be longer than FIRST_LINE_MAX_TITLE_LENGTH
        // - normalize multiple whitespaces to a single whitespace
        let modelFirstWordsCandidate = undefined;
        let firstLineText = textEditorModel
            .getValueInRange({
            startLineNumber: 1,
            endLineNumber: 1,
            startColumn: 1,
            endColumn: UntitledTextEditorModel_1.FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH + 1 // first cap at FIRST_LINE_NAME_CANDIDATE_MAX_LENGTH
        })
            .trim().replace(/\s+/g, ' ') // normalize whitespaces
            .replace(/\u202E/g, ''); // drop Right-to-Left Override character (#190133)
        firstLineText = firstLineText.substr(0, getCharContainingOffset(// finally cap at FIRST_LINE_NAME_MAX_LENGTH (grapheme aware #111235)
        firstLineText, UntitledTextEditorModel_1.FIRST_LINE_NAME_MAX_LENGTH)[0]);
        if (firstLineText && ensureValidWordDefinition().exec(firstLineText)) {
            modelFirstWordsCandidate = firstLineText;
        }
        if (modelFirstWordsCandidate !== this.cachedModelFirstLineWords) {
            this.cachedModelFirstLineWords = modelFirstWordsCandidate;
            this._onDidChangeName.fire();
        }
    }
    //#endregion
    isReadonly() {
        return false;
    }
};
UntitledTextEditorModel = UntitledTextEditorModel_1 = __decorate([
    __param(5, ILanguageService),
    __param(6, IModelService),
    __param(7, IWorkingCopyBackupService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IWorkingCopyService),
    __param(10, ITextFileService),
    __param(11, ILabelService),
    __param(12, IEditorService),
    __param(13, ILanguageDetectionService),
    __param(14, IAccessibilityService)
], UntitledTextEditorModel);
export { UntitledTextEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvY29tbW9uL3VudGl0bGVkVGV4dEVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFGLE9BQU8sRUFBeUMsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUUzSixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUUxSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQTZELFVBQVUsRUFBeUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2SixPQUFPLEVBQXNDLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEUsT0FBTyxF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
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
var BinaryFileEditor_1;
import { localize } from '../../../../../nls.js';
import { BaseBinaryResourceEditor } from '../../../../browser/parts/editor/binaryEditor.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { FileEditorInput } from './fileEditorInput.js';
import { BINARY_FILE_EDITOR_ID, BINARY_TEXT_FILE_MODE } from '../../common/files.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { EditorResolution } from '../../../../../platform/editor/common/editor.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { isEditorInputWithOptions } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
/**
 * An implementation of editor for binary files that cannot be displayed.
 */
let BinaryFileEditor = class BinaryFileEditor extends BaseBinaryResourceEditor {
    static { BinaryFileEditor_1 = this; }
    static { this.ID = BINARY_FILE_EDITOR_ID; }
    constructor(group, telemetryService, themeService, editorResolverService, storageService) {
        super(BinaryFileEditor_1.ID, group, {
            openInternal: (input, options) => this.openInternal(input, options)
        }, telemetryService, themeService, storageService);
        this.editorResolverService = editorResolverService;
    }
    async openInternal(input, options) {
        if (input instanceof FileEditorInput && this.group.activeEditor) {
            // We operate on the active editor here to support re-opening
            // diff editors where `input` may just be one side of the
            // diff editor.
            // Since `openInternal` can only ever be selected from the
            // active editor of the group, this is a safe assumption.
            // (https://github.com/microsoft/vscode/issues/124222)
            const activeEditor = this.group.activeEditor;
            const untypedActiveEditor = activeEditor?.toUntyped();
            if (!untypedActiveEditor) {
                return; // we need untyped editor support
            }
            // Try to let the user pick an editor
            let resolvedEditor = await this.editorResolverService.resolveEditor({
                ...untypedActiveEditor,
                options: {
                    ...options,
                    override: EditorResolution.PICK
                }
            }, this.group);
            if (resolvedEditor === 2 /* ResolvedStatus.NONE */) {
                resolvedEditor = undefined;
            }
            else if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                return;
            }
            // If the result if a file editor, the user indicated to open
            // the binary file as text. As such we adjust the input for that.
            if (isEditorInputWithOptions(resolvedEditor)) {
                for (const editor of resolvedEditor.editor instanceof DiffEditorInput ? [resolvedEditor.editor.original, resolvedEditor.editor.modified] : [resolvedEditor.editor]) {
                    if (editor instanceof FileEditorInput) {
                        editor.setForceOpenAsText();
                        editor.setPreferredLanguageId(BINARY_TEXT_FILE_MODE); // https://github.com/microsoft/vscode/issues/131076
                    }
                }
            }
            // Replace the active editor with the picked one
            await this.group.replaceEditors([{
                    editor: activeEditor,
                    replacement: resolvedEditor?.editor ?? input,
                    options: {
                        ...resolvedEditor?.options ?? options
                    }
                }]);
        }
    }
    getTitle() {
        return this.input ? this.input.getName() : localize('binaryFileEditor', "Binary File Viewer");
    }
};
BinaryFileEditor = BinaryFileEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IEditorResolverService),
    __param(4, IStorageService)
], BinaryFileEditor);
export { BinaryFileEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RmlsZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvYmluYXJ5RmlsZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQWtDLE1BQU0sNkRBQTZELENBQUM7QUFDckksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRy9FOztHQUVHO0FBQ0ksSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSx3QkFBd0I7O2FBRTdDLE9BQUUsR0FBRyxxQkFBcUIsQUFBeEIsQ0FBeUI7SUFFM0MsWUFDQyxLQUFtQixFQUNBLGdCQUFtQyxFQUN2QyxZQUEyQixFQUNELHFCQUE2QyxFQUNyRSxj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
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
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { BinaryEditorModel } from '../../../common/editor/binaryEditorModel.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { EditorPlaceholder } from './editorPlaceholder.js';
/*
 * This class is only intended to be subclassed and not instantiated.
 */
let BaseBinaryResourceEditor = class BaseBinaryResourceEditor extends EditorPlaceholder {
    constructor(id, group, callbacks, telemetryService, themeService, storageService) {
        super(id, group, telemetryService, themeService, storageService);
        this.callbacks = callbacks;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidOpenInPlace = this._register(new Emitter());
        this.onDidOpenInPlace = this._onDidOpenInPlace.event;
    }
    getTitle() {
        return this.input ? this.input.getName() : localize('binaryEditor', "Binary Viewer");
    }
    async getContents(input, options) {
        const model = await input.resolve();
        // Assert Model instance
        if (!(model instanceof BinaryEditorModel)) {
            throw new Error('Unable to open file as binary');
        }
        // Update metadata
        const size = model.getSize();
        this.handleMetadataChanged(typeof size === 'number' ? ByteSize.formatSize(size) : '');
        return {
            icon: '$(warning)',
            label: localize('binaryError', "The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding."),
            actions: [
                {
                    label: localize('openAnyway', "Open Anyway"),
                    run: async () => {
                        // Open in place
                        await this.callbacks.openInternal(input, options);
                        // Signal to listeners that the binary editor has been opened in-place
                        this._onDidOpenInPlace.fire();
                    }
                }
            ]
        };
    }
    handleMetadataChanged(meta) {
        this.metadata = meta;
        this._onDidChangeMetadata.fire();
    }
    getMetadata() {
        return this.metadata;
    }
};
BaseBinaryResourceEditor = __decorate([
    __param(5, IStorageService)
], BaseBinaryResourceEditor);
export { BaseBinaryResourceEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9iaW5hcnlFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUdoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBOEIsTUFBTSx3QkFBd0IsQ0FBQztBQU92Rjs7R0FFRztBQUNJLElBQWUsd0JBQXdCLEdBQXZDLE1BQWUsd0JBQXlCLFNBQVEsaUJBQWlCO0lBVXZFLFlBQ0MsRUFBVSxFQUNWLEtBQW1CLEVBQ0YsU0FBeUIsRUFDMUMsZ0JBQW1DLEVBQ25DLFlBQTJCLEVBQ1YsY0FBK0I7UUFFaEQsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBTGhELGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBWDFCLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ25FLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFFOUMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDaEUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztJQWF6RCxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVTLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBa0IsRUFBRSxPQUF1QjtRQUN0RSxNQUFNLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVwQyx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFdEYsT0FBTztZQUNOLElBQUksRUFBRSxZQUFZO1lBQ2xCLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGdIQUFnSCxDQUFDO1lBQ2hKLE9BQU8sRUFBRTtnQkFDUjtvQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7b0JBQzVDLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFFZixnQkFBZ0I7d0JBQ2hCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUVsRCxzRUFBc0U7d0JBQ3RFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDL0IsQ0FBQztpQkFDRDthQUNEO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxJQUF3QjtRQUNyRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUVyQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztDQUNELENBQUE7QUFqRXFCLHdCQUF3QjtJQWdCM0MsV0FBQSxlQUFlLENBQUE7R0FoQkksd0JBQXdCLENBaUU3QyJ9
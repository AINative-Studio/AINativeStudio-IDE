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
import { EditorModel } from './editorModel.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { Mimes } from '../../../base/common/mime.js';
/**
 * An editor model that just represents a resource that can be loaded.
 */
let BinaryEditorModel = class BinaryEditorModel extends EditorModel {
    constructor(resource, name, fileService) {
        super();
        this.resource = resource;
        this.name = name;
        this.fileService = fileService;
        this.mime = Mimes.binary;
    }
    /**
     * The name of the binary resource.
     */
    getName() {
        return this.name;
    }
    /**
     * The size of the binary resource if known.
     */
    getSize() {
        return this.size;
    }
    /**
     * The mime of the binary resource if known.
     */
    getMime() {
        return this.mime;
    }
    /**
     * The etag of the binary resource if known.
     */
    getETag() {
        return this.etag;
    }
    async resolve() {
        // Make sure to resolve up to date stat for file resources
        if (this.fileService.hasProvider(this.resource)) {
            const stat = await this.fileService.stat(this.resource);
            this.etag = stat.etag;
            if (typeof stat.size === 'number') {
                this.size = stat.size;
            }
        }
        return super.resolve();
    }
};
BinaryEditorModel = __decorate([
    __param(2, IFileService)
], BinaryEditorModel);
export { BinaryEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvYmluYXJ5RWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFckQ7O0dBRUc7QUFDSSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFdBQVc7SUFPakQsWUFDVSxRQUFhLEVBQ0wsSUFBWSxFQUNmLFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBSkMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNMLFNBQUksR0FBSixJQUFJLENBQVE7UUFDRSxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVJ4QyxTQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQVdyQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTztRQUVyQiwwREFBMEQ7UUFDMUQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRCxDQUFBO0FBeERZLGlCQUFpQjtJQVUzQixXQUFBLFlBQVksQ0FBQTtHQVZGLGlCQUFpQixDQXdEN0IifQ==
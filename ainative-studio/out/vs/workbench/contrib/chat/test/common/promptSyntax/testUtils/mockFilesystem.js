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
import { URI } from '../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(folders, fileService) {
        this.folders = folders;
        this.fileService = fileService;
    }
    /**
     * Starts the mock process.
     */
    async mock() {
        return await Promise.all(this.folders
            .map((folder) => {
            return this.mockFolder(folder);
        }));
    }
    /**
     * The internal implementation of the filesystem mocking process.
     *
     * @throws If a folder or file in the filesystem structure already exists.
     * 		   This is to prevent subtle errors caused by overwriting existing files.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder
            ? URI.joinPath(parentFolder, folder.name)
            : URI.file(folder.name);
        assert(!(await this.fileService.exists(folderUri)), `Folder '${folderUri.path}' already exists.`);
        try {
            await this.fileService.createFolder(folderUri);
        }
        catch (error) {
            throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                assert(!(await this.fileService.exists(childUri)), `File '${folderUri.path}' already exists.`);
                await this.fileService.writeFile(childUri, VSBuffer.fromString(child.contents));
                resolvedChildren.push({
                    ...child,
                    uri: childUri,
                });
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return {
            ...folder,
            uri: folderUri,
        };
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL21vY2tGaWxlc3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQTRCbkY7O0dBRUc7QUFDSSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBQzFCLFlBQ2tCLE9BQXNCLEVBQ1IsV0FBeUI7UUFEdkMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQUNSLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3JELENBQUM7SUFFTDs7T0FFRztJQUNJLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLE9BQU8sTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsT0FBTzthQUNWLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxLQUFLLENBQUMsVUFBVSxDQUN2QixNQUFtQixFQUNuQixZQUFrQjtRQUVsQixNQUFNLFNBQVMsR0FBRyxZQUFZO1lBQzdCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QixNQUFNLENBQ0wsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFDM0MsV0FBVyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FDNUMsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsU0FBUyxDQUFDLE1BQU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFvRCxFQUFFLENBQUM7UUFDN0UsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JELG9CQUFvQjtZQUNwQixJQUFJLFVBQVUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxDQUNMLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQzFDLFNBQVMsU0FBUyxDQUFDLElBQUksbUJBQW1CLENBQzFDLENBQUM7Z0JBRUYsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFFaEYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO29CQUNyQixHQUFHLEtBQUs7b0JBQ1IsR0FBRyxFQUFFLFFBQVE7aUJBQ2IsQ0FBQyxDQUFDO2dCQUVILFNBQVM7WUFDVixDQUFDO1lBRUQsZ0RBQWdEO1lBQ2hELGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELE9BQU87WUFDTixHQUFHLE1BQU07WUFDVCxHQUFHLEVBQUUsU0FBUztTQUNkLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXhFWSxjQUFjO0lBR3hCLFdBQUEsWUFBWSxDQUFBO0dBSEYsY0FBYyxDQXdFMUIifQ==
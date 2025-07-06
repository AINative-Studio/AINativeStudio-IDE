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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvbW9ja0ZpbGVzeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBNEJuRjs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFDMUIsWUFDa0IsT0FBc0IsRUFDUixXQUF5QjtRQUR2QyxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQ1IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFDckQsQ0FBQztJQUVMOztPQUVHO0lBQ0ksS0FBSyxDQUFDLElBQUk7UUFDaEIsT0FBTyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3ZCLElBQUksQ0FBQyxPQUFPO2FBQ1YsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLEtBQUssQ0FBQyxVQUFVLENBQ3ZCLE1BQW1CLEVBQ25CLFlBQWtCO1FBRWxCLE1BQU0sU0FBUyxHQUFHLFlBQVk7WUFDN0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpCLE1BQU0sQ0FDTCxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUMzQyxXQUFXLFNBQVMsQ0FBQyxJQUFJLG1CQUFtQixDQUM1QyxDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixTQUFTLENBQUMsTUFBTSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQW9ELEVBQUUsQ0FBQztRQUM3RSxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckQsb0JBQW9CO1lBQ3BCLElBQUksVUFBVSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN6QixNQUFNLENBQ0wsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDMUMsU0FBUyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FDMUMsQ0FBQztnQkFFRixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUVoRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLEdBQUcsS0FBSztvQkFDUixHQUFHLEVBQUUsUUFBUTtpQkFDYixDQUFDLENBQUM7Z0JBRUgsU0FBUztZQUNWLENBQUM7WUFFRCxnREFBZ0Q7WUFDaEQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsT0FBTztZQUNOLEdBQUcsTUFBTTtZQUNULEdBQUcsRUFBRSxTQUFTO1NBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBeEVZLGNBQWM7SUFHeEIsV0FBQSxZQUFZLENBQUE7R0FIRixjQUFjLENBd0UxQiJ9
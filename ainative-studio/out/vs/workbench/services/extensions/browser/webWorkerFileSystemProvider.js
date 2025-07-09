/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileType, FileSystemProviderErrorCode, createFileSystemProviderError } from '../../../../platform/files/common/files.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NotSupportedError } from '../../../../base/common/errors.js';
export class FetchFileSystemProvider {
    constructor() {
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ + 2 /* FileSystemProviderCapabilities.FileReadWrite */ + 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    // working implementations
    async readFile(resource) {
        try {
            const res = await fetch(resource.toString(true));
            if (res.status === 200) {
                return new Uint8Array(await res.arrayBuffer());
            }
            throw createFileSystemProviderError(res.statusText, FileSystemProviderErrorCode.Unknown);
        }
        catch (err) {
            throw createFileSystemProviderError(err, FileSystemProviderErrorCode.Unknown);
        }
    }
    // fake implementations
    async stat(_resource) {
        return {
            type: FileType.File,
            size: 0,
            mtime: 0,
            ctime: 0
        };
    }
    watch() {
        return Disposable.None;
    }
    // error implementations
    writeFile(_resource, _content, _opts) {
        throw new NotSupportedError();
    }
    readdir(_resource) {
        throw new NotSupportedError();
    }
    mkdir(_resource) {
        throw new NotSupportedError();
    }
    delete(_resource, _opts) {
        throw new NotSupportedError();
    }
    rename(_from, _to, _opts) {
        throw new NotSupportedError();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2Jyb3dzZXIvd2ViV29ya2VyRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBeUMsUUFBUSxFQUFnRSwyQkFBMkIsRUFBa0QsNkJBQTZCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2UixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXRFLE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFFVSxpQkFBWSxHQUFHLHlHQUFzRiw4REFBbUQsQ0FBQztRQUN6Siw0QkFBdUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3JDLG9CQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQTZDdkMsQ0FBQztJQTNDQSwwQkFBMEI7SUFDMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhO1FBQzNCLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBQ0QsTUFBTSw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0UsQ0FBQztJQUNGLENBQUM7SUFFRCx1QkFBdUI7SUFDdkIsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFjO1FBQ3hCLE9BQU87WUFDTixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsSUFBSSxFQUFFLENBQUM7WUFDUCxLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssRUFBRSxDQUFDO1NBQ1IsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsU0FBUyxDQUFDLFNBQWMsRUFBRSxRQUFvQixFQUFFLEtBQXdCO1FBQ3ZFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFDRCxPQUFPLENBQUMsU0FBYztRQUNyQixNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBQ0QsS0FBSyxDQUFDLFNBQWM7UUFDbkIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUNELE1BQU0sQ0FBQyxTQUFjLEVBQUUsS0FBeUI7UUFDL0MsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUNELE1BQU0sQ0FBQyxLQUFVLEVBQUUsR0FBUSxFQUFFLEtBQTRCO1FBQ3hELE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRCJ9
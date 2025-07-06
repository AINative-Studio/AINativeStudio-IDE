/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Typings for the https://wicg.github.io/file-system-access
 *
 * Use `supported(window)` to find out if the browser supports this kind of API.
 */
export var WebFileSystemAccess;
(function (WebFileSystemAccess) {
    function supported(obj) {
        if (typeof obj?.showDirectoryPicker === 'function') {
            return true;
        }
        return false;
    }
    WebFileSystemAccess.supported = supported;
    function isFileSystemHandle(handle) {
        const candidate = handle;
        if (!candidate) {
            return false;
        }
        return typeof candidate.kind === 'string' && typeof candidate.queryPermission === 'function' && typeof candidate.requestPermission === 'function';
    }
    WebFileSystemAccess.isFileSystemHandle = isFileSystemHandle;
    function isFileSystemFileHandle(handle) {
        return handle.kind === 'file';
    }
    WebFileSystemAccess.isFileSystemFileHandle = isFileSystemFileHandle;
    function isFileSystemDirectoryHandle(handle) {
        return handle.kind === 'directory';
    }
    WebFileSystemAccess.isFileSystemDirectoryHandle = isFileSystemDirectoryHandle;
})(WebFileSystemAccess || (WebFileSystemAccess = {}));
// TODO@bpasero adopt official types of FileSystemObserver
export var WebFileSystemObserver;
(function (WebFileSystemObserver) {
    function supported(obj) {
        return typeof obj?.FileSystemObserver === 'function';
    }
    WebFileSystemObserver.supported = supported;
})(WebFileSystemObserver || (WebFileSystemObserver = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmlsZVN5c3RlbUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2Jyb3dzZXIvd2ViRmlsZVN5c3RlbUFjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7OztHQUlHO0FBQ0gsTUFBTSxLQUFXLG1CQUFtQixDQTBCbkM7QUExQkQsV0FBaUIsbUJBQW1CO0lBRW5DLFNBQWdCLFNBQVMsQ0FBQyxHQUFpQjtRQUMxQyxJQUFJLE9BQU8sR0FBRyxFQUFFLG1CQUFtQixLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQU5lLDZCQUFTLFlBTXhCLENBQUE7SUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFlO1FBQ2pELE1BQU0sU0FBUyxHQUFHLE1BQXNDLENBQUM7UUFDekQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxlQUFlLEtBQUssVUFBVSxJQUFJLE9BQU8sU0FBUyxDQUFDLGlCQUFpQixLQUFLLFVBQVUsQ0FBQztJQUNuSixDQUFDO0lBUGUsc0NBQWtCLHFCQU9qQyxDQUFBO0lBRUQsU0FBZ0Isc0JBQXNCLENBQUMsTUFBd0I7UUFDOUQsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBRmUsMENBQXNCLHlCQUVyQyxDQUFBO0lBRUQsU0FBZ0IsMkJBQTJCLENBQUMsTUFBd0I7UUFDbkUsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQztJQUNwQyxDQUFDO0lBRmUsK0NBQTJCLDhCQUUxQyxDQUFBO0FBQ0YsQ0FBQyxFQTFCZ0IsbUJBQW1CLEtBQW5CLG1CQUFtQixRQTBCbkM7QUFFRCwwREFBMEQ7QUFDMUQsTUFBTSxLQUFXLHFCQUFxQixDQUtyQztBQUxELFdBQWlCLHFCQUFxQjtJQUVyQyxTQUFnQixTQUFTLENBQUMsR0FBaUI7UUFDMUMsT0FBTyxPQUFPLEdBQUcsRUFBRSxrQkFBa0IsS0FBSyxVQUFVLENBQUM7SUFDdEQsQ0FBQztJQUZlLCtCQUFTLFlBRXhCLENBQUE7QUFDRixDQUFDLEVBTGdCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFLckMifQ==
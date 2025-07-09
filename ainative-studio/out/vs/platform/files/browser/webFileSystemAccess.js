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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmlsZVN5c3RlbUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9icm93c2VyL3dlYkZpbGVTeXN0ZW1BY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7R0FJRztBQUNILE1BQU0sS0FBVyxtQkFBbUIsQ0EwQm5DO0FBMUJELFdBQWlCLG1CQUFtQjtJQUVuQyxTQUFnQixTQUFTLENBQUMsR0FBaUI7UUFDMUMsSUFBSSxPQUFPLEdBQUcsRUFBRSxtQkFBbUIsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNwRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFOZSw2QkFBUyxZQU14QixDQUFBO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUMsTUFBZTtRQUNqRCxNQUFNLFNBQVMsR0FBRyxNQUFzQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLE9BQU8sU0FBUyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxTQUFTLENBQUMsZUFBZSxLQUFLLFVBQVUsSUFBSSxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsS0FBSyxVQUFVLENBQUM7SUFDbkosQ0FBQztJQVBlLHNDQUFrQixxQkFPakMsQ0FBQTtJQUVELFNBQWdCLHNCQUFzQixDQUFDLE1BQXdCO1FBQzlELE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7SUFDL0IsQ0FBQztJQUZlLDBDQUFzQix5QkFFckMsQ0FBQTtJQUVELFNBQWdCLDJCQUEyQixDQUFDLE1BQXdCO1FBQ25FLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDcEMsQ0FBQztJQUZlLCtDQUEyQiw4QkFFMUMsQ0FBQTtBQUNGLENBQUMsRUExQmdCLG1CQUFtQixLQUFuQixtQkFBbUIsUUEwQm5DO0FBRUQsMERBQTBEO0FBQzFELE1BQU0sS0FBVyxxQkFBcUIsQ0FLckM7QUFMRCxXQUFpQixxQkFBcUI7SUFFckMsU0FBZ0IsU0FBUyxDQUFDLEdBQWlCO1FBQzFDLE9BQU8sT0FBTyxHQUFHLEVBQUUsa0JBQWtCLEtBQUssVUFBVSxDQUFDO0lBQ3RELENBQUM7SUFGZSwrQkFBUyxZQUV4QixDQUFBO0FBQ0YsQ0FBQyxFQUxnQixxQkFBcUIsS0FBckIscUJBQXFCLFFBS3JDIn0=
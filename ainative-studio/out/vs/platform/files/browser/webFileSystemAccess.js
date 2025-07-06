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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRmlsZVN5c3RlbUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvYnJvd3Nlci93ZWJGaWxlU3lzdGVtQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7O0dBSUc7QUFDSCxNQUFNLEtBQVcsbUJBQW1CLENBMEJuQztBQTFCRCxXQUFpQixtQkFBbUI7SUFFbkMsU0FBZ0IsU0FBUyxDQUFDLEdBQWlCO1FBQzFDLElBQUksT0FBTyxHQUFHLEVBQUUsbUJBQW1CLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBTmUsNkJBQVMsWUFNeEIsQ0FBQTtJQUVELFNBQWdCLGtCQUFrQixDQUFDLE1BQWU7UUFDakQsTUFBTSxTQUFTLEdBQUcsTUFBc0MsQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sU0FBUyxDQUFDLGVBQWUsS0FBSyxVQUFVLElBQUksT0FBTyxTQUFTLENBQUMsaUJBQWlCLEtBQUssVUFBVSxDQUFDO0lBQ25KLENBQUM7SUFQZSxzQ0FBa0IscUJBT2pDLENBQUE7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxNQUF3QjtRQUM5RCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFGZSwwQ0FBc0IseUJBRXJDLENBQUE7SUFFRCxTQUFnQiwyQkFBMkIsQ0FBQyxNQUF3QjtRQUNuRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDO0lBQ3BDLENBQUM7SUFGZSwrQ0FBMkIsOEJBRTFDLENBQUE7QUFDRixDQUFDLEVBMUJnQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBMEJuQztBQUVELDBEQUEwRDtBQUMxRCxNQUFNLEtBQVcscUJBQXFCLENBS3JDO0FBTEQsV0FBaUIscUJBQXFCO0lBRXJDLFNBQWdCLFNBQVMsQ0FBQyxHQUFpQjtRQUMxQyxPQUFPLE9BQU8sR0FBRyxFQUFFLGtCQUFrQixLQUFLLFVBQVUsQ0FBQztJQUN0RCxDQUFDO0lBRmUsK0JBQVMsWUFFeEIsQ0FBQTtBQUNGLENBQUMsRUFMZ0IscUJBQXFCLEtBQXJCLHFCQUFxQixRQUtyQyJ9
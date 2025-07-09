/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener } from './dom.js';
import { Disposable } from '../common/lifecycle.js';
import { Mimes } from '../common/mime.js';
/**
 * A helper that will execute a provided function when the provided HTMLElement receives
 *  dragover event for 800ms. If the drag is aborted before, the callback will not be triggered.
 */
export class DelayedDragHandler extends Disposable {
    constructor(container, callback) {
        super();
        this._register(addDisposableListener(container, 'dragover', e => {
            e.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
            if (!this.timeout) {
                this.timeout = setTimeout(() => {
                    callback();
                    this.timeout = null;
                }, 800);
            }
        }));
        ['dragleave', 'drop', 'dragend'].forEach(type => {
            this._register(addDisposableListener(container, type, () => {
                this.clearDragTimeout();
            }));
        });
    }
    clearDragTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
    dispose() {
        super.dispose();
        this.clearDragTimeout();
    }
}
// Common data transfers
export const DataTransfers = {
    /**
     * Application specific resource transfer type
     */
    RESOURCES: 'ResourceURLs',
    /**
     * Browser specific transfer type to download
     */
    DOWNLOAD_URL: 'DownloadURL',
    /**
     * Browser specific transfer type for files
     */
    FILES: 'Files',
    /**
     * Typically transfer type for copy/paste transfers.
     */
    TEXT: Mimes.text,
    /**
     * Internal type used to pass around text/uri-list data.
     *
     * This is needed to work around https://bugs.chromium.org/p/chromium/issues/detail?id=239745.
     */
    INTERNAL_URI_LIST: 'application/vnd.code.uri-list',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFMUM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFHakQsWUFBWSxTQUFzQixFQUFFLFFBQW9CO1FBQ3ZELEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9ELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLHFIQUFxSDtZQUV6SSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQzlCLFFBQVEsRUFBRSxDQUFDO29CQUVYLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDVCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDMUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVoQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0Q7QUFFRCx3QkFBd0I7QUFDeEIsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHO0lBRTVCOztPQUVHO0lBQ0gsU0FBUyxFQUFFLGNBQWM7SUFFekI7O09BRUc7SUFDSCxZQUFZLEVBQUUsYUFBYTtJQUUzQjs7T0FFRztJQUNILEtBQUssRUFBRSxPQUFPO0lBRWQ7O09BRUc7SUFDSCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7SUFFaEI7Ozs7T0FJRztJQUNILGlCQUFpQixFQUFFLCtCQUErQjtDQUNsRCxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
export class WebviewInput extends EditorInput {
    static { this.typeId = 'workbench.editors.webviewInput'; }
    get typeId() {
        return WebviewInput.typeId;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.webviewPanel,
            path: `webview-panel/webview-${this._resourceId}`
        });
    }
    constructor(init, webview, _iconManager) {
        super();
        this._iconManager = _iconManager;
        this._resourceId = generateUuid();
        this._hasTransfered = false;
        this.viewType = init.viewType;
        this.providedId = init.providedId;
        this._name = init.name;
        this._webview = webview;
    }
    dispose() {
        if (!this.isDisposed()) {
            if (!this._hasTransfered) {
                this._webview?.dispose();
            }
        }
        super.dispose();
    }
    getName() {
        return this._name;
    }
    getTitle(_verbosity) {
        return this.getName();
    }
    getDescription() {
        return undefined;
    }
    setName(value) {
        this._name = value;
        this.webview.setTitle(value);
        this._onDidChangeLabel.fire();
    }
    get webview() {
        return this._webview;
    }
    get extension() {
        return this.webview.extension;
    }
    get iconPath() {
        return this._iconPath;
    }
    set iconPath(value) {
        this._iconPath = value;
        this._iconManager.setIcons(this._resourceId, value);
    }
    matches(other) {
        return super.matches(other) || other === this;
    }
    get group() {
        return this._group;
    }
    updateGroup(group) {
        this._group = group;
    }
    transfer(other) {
        if (this._hasTransfered) {
            return undefined;
        }
        this._hasTransfered = true;
        other._webview = this._webview;
        return other;
    }
    claim(claimant, targetWindow, scopedContextKeyService) {
        return this._webview.claim(claimant, targetWindow, scopedContextKeyService);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUcvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFVcEUsTUFBTSxPQUFPLFlBQWEsU0FBUSxXQUFXO2FBRTlCLFdBQU0sR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBb0M7SUFFeEQsSUFBb0IsTUFBTTtRQUN6QixPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQW9CLFFBQVE7UUFDM0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFvQixZQUFZO1FBQy9CLE9BQU8sb0ZBQW9FLHNEQUE0QyxDQUFDO0lBQ3pILENBQUM7SUFZRCxJQUFJLFFBQVE7UUFDWCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDNUIsSUFBSSxFQUFFLHlCQUF5QixJQUFJLENBQUMsV0FBVyxFQUFFO1NBQ2pELENBQUMsQ0FBQztJQUNKLENBQUM7SUFLRCxZQUNDLElBQTBCLEVBQzFCLE9BQXdCLEVBQ1AsWUFBZ0M7UUFFakQsS0FBSyxFQUFFLENBQUM7UUFGUyxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7UUF2QmpDLGdCQUFXLEdBQUcs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
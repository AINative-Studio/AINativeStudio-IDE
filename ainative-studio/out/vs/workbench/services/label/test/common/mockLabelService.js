/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename, normalize } from '../../../../../base/common/path.js';
export class MockLabelService {
    constructor() {
        this.onDidChangeFormatters = new Emitter().event;
    }
    registerCachedFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
    getUriLabel(resource, options) {
        return normalize(resource.fsPath);
    }
    getUriBasenameLabel(resource) {
        return basename(resource.fsPath);
    }
    getWorkspaceLabel(workspace, options) {
        return '';
    }
    getHostLabel(scheme, authority) {
        return '';
    }
    getHostTooltip() {
        return '';
    }
    getSeparator(scheme, authority) {
        return '/';
    }
    registerFormatter(formatter) {
        return Disposable.None;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGFiZWwvdGVzdC9jb21tb24vbW9ja0xhYmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFLekUsTUFBTSxPQUFPLGdCQUFnQjtJQUE3QjtRQTJCQywwQkFBcUIsR0FBaUMsSUFBSSxPQUFPLEVBQXlCLENBQUMsS0FBSyxDQUFDO0lBQ2xHLENBQUM7SUF6QkEsdUJBQXVCLENBQUMsU0FBaUM7UUFDeEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxXQUFXLENBQUMsUUFBYSxFQUFFLE9BQTRFO1FBQ3RHLE9BQU8sU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsUUFBYTtRQUNoQyxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNELGlCQUFpQixDQUFDLFNBQWtELEVBQUUsT0FBZ0M7UUFDckcsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBQ0QsWUFBWSxDQUFDLE1BQWMsRUFBRSxTQUFrQjtRQUM5QyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFDTSxjQUFjO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBa0I7UUFDOUMsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBQ0QsaUJBQWlCLENBQUMsU0FBaUM7UUFDbEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7Q0FFRCJ9
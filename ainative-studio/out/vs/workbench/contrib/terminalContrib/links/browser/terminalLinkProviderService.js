/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class TerminalLinkProviderService {
    constructor() {
        this._linkProviders = new Set();
        this._onDidAddLinkProvider = new Emitter();
        this._onDidRemoveLinkProvider = new Emitter();
    }
    get linkProviders() { return this._linkProviders; }
    get onDidAddLinkProvider() { return this._onDidAddLinkProvider.event; }
    get onDidRemoveLinkProvider() { return this._onDidRemoveLinkProvider.event; }
    registerLinkProvider(linkProvider) {
        const disposables = [];
        this._linkProviders.add(linkProvider);
        this._onDidAddLinkProvider.fire(linkProvider);
        return {
            dispose: () => {
                for (const disposable of disposables) {
                    disposable.dispose();
                }
                this._linkProviders.delete(linkProvider);
                this._onDidRemoveLinkProvider.fire(linkProvider);
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUHJvdmlkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua1Byb3ZpZGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFHckUsTUFBTSxPQUFPLDJCQUEyQjtJQUF4QztRQUdTLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7UUFHakQsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQWlDLENBQUM7UUFFckUsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQWlDLENBQUM7SUFpQjFGLENBQUM7SUFyQkEsSUFBSSxhQUFhLEtBQWlELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFHL0YsSUFBSSxvQkFBb0IsS0FBMkMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUU3RyxJQUFJLHVCQUF1QixLQUEyQyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRW5ILG9CQUFvQixDQUFDLFlBQTJDO1FBQy9ELE1BQU0sV0FBVyxHQUFrQixFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5QyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUN0QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbEQsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==
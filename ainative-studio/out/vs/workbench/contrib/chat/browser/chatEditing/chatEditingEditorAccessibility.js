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
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent } from '../../../../../base/common/observable.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
let ChatEditingEditorAccessibility = class ChatEditingEditorAccessibility {
    static { this.ID = 'chat.edits.accessibilty'; }
    constructor(chatEditingService, editorService, accessibilityService) {
        this._store = new DisposableStore();
        const activeUri = observableFromEvent(this, editorService.onDidActiveEditorChange, () => editorService.activeEditorPane?.input.resource);
        this._store.add(autorun(r => {
            const editor = activeUri.read(r);
            if (!editor) {
                return;
            }
            const entry = chatEditingService.editingSessionsObs.read(r).find(session => session.readEntry(editor, r));
            if (entry) {
                accessibilityService.playSignal(AccessibilitySignal.chatEditModifiedFile);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorAccessibility = __decorate([
    __param(0, IChatEditingService),
    __param(1, IEditorService),
    __param(2, IAccessibilitySignalService)
], ChatEditingEditorAccessibility);
export { ChatEditingEditorAccessibility };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0VkaXRvckFjY2Vzc2liaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUVySixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbEUsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7YUFFMUIsT0FBRSxHQUFHLHlCQUF5QixBQUE1QixDQUE2QjtJQUkvQyxZQUNzQixrQkFBdUMsRUFDNUMsYUFBNkIsRUFDaEIsb0JBQWlEO1FBTDlELFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBUS9DLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV6SSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFFM0IsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQzNFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7O0FBOUJXLDhCQUE4QjtJQU94QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSwyQkFBMkIsQ0FBQTtHQVRqQiw4QkFBOEIsQ0ErQjFDIn0=
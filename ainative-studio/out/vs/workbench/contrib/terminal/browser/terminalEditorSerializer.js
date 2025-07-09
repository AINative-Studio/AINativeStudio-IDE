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
import { ITerminalEditorService } from './terminal.js';
let TerminalInputSerializer = class TerminalInputSerializer {
    constructor(_terminalEditorService) {
        this._terminalEditorService = _terminalEditorService;
    }
    canSerialize(editorInput) {
        return typeof editorInput.terminalInstance?.persistentProcessId === 'number' && editorInput.terminalInstance.shouldPersist;
    }
    serialize(editorInput) {
        if (!this.canSerialize(editorInput)) {
            return;
        }
        return JSON.stringify(this._toJson(editorInput.terminalInstance));
    }
    deserialize(instantiationService, serializedEditorInput) {
        const terminalInstance = JSON.parse(serializedEditorInput);
        return this._terminalEditorService.reviveInput(terminalInstance);
    }
    _toJson(instance) {
        return {
            id: instance.persistentProcessId,
            pid: instance.processId || 0,
            title: instance.title,
            titleSource: instance.titleSource,
            cwd: '',
            icon: instance.icon,
            color: instance.color,
            hasChildProcesses: instance.hasChildProcesses,
            isFeatureTerminal: instance.shellLaunchConfig.isFeatureTerminal,
            hideFromUser: instance.shellLaunchConfig.hideFromUser,
            reconnectionProperties: instance.shellLaunchConfig.reconnectionProperties,
            shellIntegrationNonce: instance.shellIntegrationNonce
        };
    }
};
TerminalInputSerializer = __decorate([
    __param(0, ITerminalEditorService)
], TerminalInputSerializer);
export { TerminalInputSerializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFZGl0b3JTZXJpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBa0Msc0JBQXNCLEVBQXFCLE1BQU0sZUFBZSxDQUFDO0FBR25HLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBQ25DLFlBQzBDLHNCQUE4QztRQUE5QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO0lBQ3BGLENBQUM7SUFFRSxZQUFZLENBQUMsV0FBZ0M7UUFDbkQsT0FBTyxPQUFPLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsS0FBSyxRQUFRLElBQUksV0FBVyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQztJQUM1SCxDQUFDO0lBRU0sU0FBUyxDQUFDLFdBQWdDO1FBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTztRQUNSLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFTSxXQUFXLENBQUMsb0JBQTJDLEVBQUUscUJBQTZCO1FBQzVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFTyxPQUFPLENBQUMsUUFBMkI7UUFDMUMsT0FBTztZQUNOLEVBQUUsRUFBRSxRQUFRLENBQUMsbUJBQW9CO1lBQ2pDLEdBQUcsRUFBRSxRQUFRLENBQUMsU0FBUyxJQUFJLENBQUM7WUFDNUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztZQUNqQyxHQUFHLEVBQUUsRUFBRTtZQUNQLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtZQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtZQUM3QyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCO1lBQy9ELFlBQVksRUFBRSxRQUFRLENBQUMsaUJBQWlCLENBQUMsWUFBWTtZQUNyRCxzQkFBc0IsRUFBRSxRQUFRLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCO1lBQ3pFLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxxQkFBcUI7U0FDckQsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBckNZLHVCQUF1QjtJQUVqQyxXQUFBLHNCQUFzQixDQUFBO0dBRlosdUJBQXVCLENBcUNuQyJ9
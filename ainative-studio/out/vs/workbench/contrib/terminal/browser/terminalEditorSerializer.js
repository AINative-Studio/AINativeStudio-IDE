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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEVkaXRvclNlcmlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFrQyxzQkFBc0IsRUFBcUIsTUFBTSxlQUFlLENBQUM7QUFHbkcsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFDbkMsWUFDMEMsc0JBQThDO1FBQTlDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7SUFDcEYsQ0FBQztJQUVFLFlBQVksQ0FBQyxXQUFnQztRQUNuRCxPQUFPLE9BQU8sV0FBVyxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixLQUFLLFFBQVEsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDO0lBQzVILENBQUM7SUFFTSxTQUFTLENBQUMsV0FBZ0M7UUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVNLFdBQVcsQ0FBQyxvQkFBMkMsRUFBRSxxQkFBNkI7UUFDNUYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDM0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLE9BQU8sQ0FBQyxRQUEyQjtRQUMxQyxPQUFPO1lBQ04sRUFBRSxFQUFFLFFBQVEsQ0FBQyxtQkFBb0I7WUFDakMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxTQUFTLElBQUksQ0FBQztZQUM1QixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXO1lBQ2pDLEdBQUcsRUFBRSxFQUFFO1lBQ1AsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixpQkFBaUIsRUFBRSxRQUFRLENBQUMsaUJBQWlCO1lBQzdDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUI7WUFDL0QsWUFBWSxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZO1lBQ3JELHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0I7WUFDekUscUJBQXFCLEVBQUUsUUFBUSxDQUFDLHFCQUFxQjtTQUNyRCxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFyQ1ksdUJBQXVCO0lBRWpDLFdBQUEsc0JBQXNCLENBQUE7R0FGWix1QkFBdUIsQ0FxQ25DIn0=
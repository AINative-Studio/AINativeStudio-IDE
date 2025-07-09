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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
import { IAccessibilitySignalService, AccessibilitySignal } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IDebugService } from '../../debug/common/debug.js';
let AccessibilitySignalLineDebuggerContribution = class AccessibilitySignalLineDebuggerContribution extends Disposable {
    constructor(debugService, accessibilitySignalService) {
        super();
        this.accessibilitySignalService = accessibilitySignalService;
        const isEnabled = observableFromEvent(this, accessibilitySignalService.onSoundEnabledChanged(AccessibilitySignal.onDebugBreak), () => accessibilitySignalService.isSoundEnabled(AccessibilitySignal.onDebugBreak));
        this._register(autorunWithStore((reader, store) => {
            /** @description subscribe to debug sessions */
            if (!isEnabled.read(reader)) {
                return;
            }
            const sessionDisposables = new Map();
            store.add(toDisposable(() => {
                sessionDisposables.forEach(d => d.dispose());
                sessionDisposables.clear();
            }));
            store.add(debugService.onDidNewSession((session) => sessionDisposables.set(session, this.handleSession(session))));
            store.add(debugService.onDidEndSession(({ session }) => {
                sessionDisposables.get(session)?.dispose();
                sessionDisposables.delete(session);
            }));
            debugService
                .getModel()
                .getSessions()
                .forEach((session) => sessionDisposables.set(session, this.handleSession(session)));
        }));
    }
    handleSession(session) {
        return session.onDidChangeState(e => {
            const stoppedDetails = session.getStoppedDetails();
            const BREAKPOINT_STOP_REASON = 'breakpoint';
            if (stoppedDetails && stoppedDetails.reason === BREAKPOINT_STOP_REASON) {
                this.accessibilitySignalService.playSignal(AccessibilitySignal.onDebugBreak);
            }
        });
    }
};
AccessibilitySignalLineDebuggerContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IAccessibilitySignalService)
], AccessibilitySignalLineDebuggerContribution);
export { AccessibilitySignalLineDebuggerContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbERlYnVnZ2VyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVNpZ25hbERlYnVnZ2VyQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUE4QixNQUFNLGdGQUFnRixDQUFDO0FBRTlLLE9BQU8sRUFBRSxhQUFhLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFFcEUsSUFBTSwyQ0FBMkMsR0FBakQsTUFBTSwyQ0FDWixTQUFRLFVBQVU7SUFHbEIsWUFDZ0IsWUFBMkIsRUFDSSwwQkFBc0Q7UUFFcEcsS0FBSyxFQUFFLENBQUM7UUFGc0MsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE0QjtRQUlwRyxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQ3pDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxFQUNsRixHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQ2pGLENBQUM7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2pELCtDQUErQztZQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QixPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFDakUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUMzQixrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDN0Msa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLEtBQUssQ0FBQyxHQUFHLENBQ1IsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ3hDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUM1RCxDQUNELENBQUM7WUFFRixLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7Z0JBQ3RELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDM0Msa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixZQUFZO2lCQUNWLFFBQVEsRUFBRTtpQkFDVixXQUFXLEVBQUU7aUJBQ2IsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDcEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQzVELENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFzQjtRQUMzQyxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNuRCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQztZQUM1QyxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLHNCQUFzQixFQUFFLENBQUM7Z0JBQ3hFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDOUUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUF2RFksMkNBQTJDO0lBS3JELFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSwyQkFBMkIsQ0FBQTtHQU5qQiwyQ0FBMkMsQ0F1RHZEIn0=
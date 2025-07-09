/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import Severity from '../../../../../base/common/severity.js';
import { localize } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IAuthenticationAccessService } from '../../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
export class SignOutOfAccountAction extends Action2 {
    constructor() {
        super({
            id: '_signOutOfAccount',
            title: localize('signOutOfAccount', "Sign out of account"),
            f1: false
        });
    }
    async run(accessor, { providerId, accountLabel }) {
        const authenticationService = accessor.get(IAuthenticationService);
        const authenticationUsageService = accessor.get(IAuthenticationUsageService);
        const authenticationAccessService = accessor.get(IAuthenticationAccessService);
        const dialogService = accessor.get(IDialogService);
        if (!providerId || !accountLabel) {
            throw new Error('Invalid arguments. Expected: { providerId: string; accountLabel: string }');
        }
        const allSessions = await authenticationService.getSessions(providerId);
        const sessions = allSessions.filter(s => s.account.label === accountLabel);
        const accountUsages = authenticationUsageService.readAccountUsages(providerId, accountLabel);
        const { confirmed } = await dialogService.confirm({
            type: Severity.Info,
            message: accountUsages.length
                ? localize('signOutMessage', "The account '{0}' has been used by: \n\n{1}\n\n Sign out from these extensions?", accountLabel, accountUsages.map(usage => usage.extensionName).join('\n'))
                : localize('signOutMessageSimple', "Sign out of '{0}'?", accountLabel),
            primaryButton: localize({ key: 'signOut', comment: ['&& denotes a mnemonic'] }, "&&Sign Out")
        });
        if (confirmed) {
            const removeSessionPromises = sessions.map(session => authenticationService.removeSession(providerId, session.id));
            await Promise.all(removeSessionPromises);
            authenticationUsageService.removeAccountUsage(providerId, accountLabel);
            authenticationAccessService.removeAllowedExtensions(providerId, accountLabel);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbk91dE9mQWNjb3VudEFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvc2lnbk91dE9mQWNjb3VudEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMxSCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUN4SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV0RyxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsT0FBTztJQUNsRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQkFBbUI7WUFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQztZQUMxRCxFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFnRDtRQUN4SCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRSxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RSxNQUFNLDJCQUEyQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMvRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRW5ELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0scUJBQXFCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsQ0FBQztRQUUzRSxNQUFNLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFN0YsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNqRCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsT0FBTyxFQUFFLGFBQWEsQ0FBQyxNQUFNO2dCQUM1QixDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlGQUFpRixFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekwsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLENBQUM7WUFDdkUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQztTQUM3RixDQUFDLENBQUM7UUFFSCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN6QywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDeEUsMkJBQTJCLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQy9FLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==
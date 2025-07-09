/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { QuickHelpNLS } from '../../../common/standaloneStrings.js';
import { HelpQuickAccessProvider } from '../../../../platform/quickinput/browser/helpQuickAccess.js';
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: HelpQuickAccessProvider,
    prefix: '',
    helpEntries: [{ description: QuickHelpNLS.helpQuickAccessActionLabel }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUhlbHBRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3F1aWNrQWNjZXNzL3N0YW5kYWxvbmVIZWxwUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBd0IsVUFBVSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXJHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNyRixJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLE1BQU0sRUFBRSxFQUFFO0lBQ1YsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLDBCQUEwQixFQUFFLENBQUM7Q0FDdkUsQ0FBQyxDQUFDIn0=
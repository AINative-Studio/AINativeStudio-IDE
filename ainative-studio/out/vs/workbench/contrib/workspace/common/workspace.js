/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
/**
 * Trust Context Keys
 */
export const WorkspaceTrustContext = {
    IsEnabled: new RawContextKey('isWorkspaceTrustEnabled', false, localize('workspaceTrustEnabledCtx', "Whether the workspace trust feature is enabled.")),
    IsTrusted: new RawContextKey('isWorkspaceTrusted', false, localize('workspaceTrustedCtx', "Whether the current workspace has been trusted by the user."))
};
export const MANAGE_TRUST_COMMAND_ID = 'workbench.trust.manage';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dvcmtzcGFjZS9jb21tb24vd29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckY7O0dBRUc7QUFFSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUNwQyxTQUFTLEVBQUUsSUFBSSxhQUFhLENBQVUseUJBQXlCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxpREFBaUQsQ0FBQyxDQUFDO0lBQ2hLLFNBQVMsRUFBRSxJQUFJLGFBQWEsQ0FBVSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDZEQUE2RCxDQUFDLENBQUM7Q0FDbEssQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHdCQUF3QixDQUFDIn0=
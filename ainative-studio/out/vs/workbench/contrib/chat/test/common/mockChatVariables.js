/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class MockChatVariablesService {
    getDynamicVariables(sessionId) {
        return [];
    }
    resolveVariables(prompt, attachedContextVariables) {
        return {
            variables: []
        };
    }
    attachContext(name, value, location) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tDaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE1BQU0sT0FBTyx3QkFBd0I7SUFHcEMsbUJBQW1CLENBQUMsU0FBaUI7UUFDcEMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsTUFBMEIsRUFBRSx3QkFBaUU7UUFDN0csT0FBTztZQUNOLFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQztJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWSxFQUFFLEtBQWMsRUFBRSxRQUEyQjtRQUN0RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNEIn0=
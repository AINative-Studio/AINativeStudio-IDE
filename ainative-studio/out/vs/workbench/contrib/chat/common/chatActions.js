/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isChatViewTitleActionContext(obj) {
    return !!obj &&
        typeof obj.sessionId === 'string'
        && obj.$mid === 19 /* MarshalledId.ChatViewContext */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxNQUFNLFVBQVUsNEJBQTRCLENBQUMsR0FBWTtJQUN4RCxPQUFPLENBQUMsQ0FBQyxHQUFHO1FBQ1gsT0FBUSxHQUFtQyxDQUFDLFNBQVMsS0FBSyxRQUFRO1dBQzlELEdBQW1DLENBQUMsSUFBSSwwQ0FBaUMsQ0FBQztBQUNoRixDQUFDIn0=
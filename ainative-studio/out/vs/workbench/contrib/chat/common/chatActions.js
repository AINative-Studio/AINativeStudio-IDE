/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isChatViewTitleActionContext(obj) {
    return !!obj &&
        typeof obj.sessionId === 'string'
        && obj.$mid === 19 /* MarshalledId.ChatViewContext */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsTUFBTSxVQUFVLDRCQUE0QixDQUFDLEdBQVk7SUFDeEQsT0FBTyxDQUFDLENBQUMsR0FBRztRQUNYLE9BQVEsR0FBbUMsQ0FBQyxTQUFTLEtBQUssUUFBUTtXQUM5RCxHQUFtQyxDQUFDLElBQUksMENBQWlDLENBQUM7QUFDaEYsQ0FBQyJ9
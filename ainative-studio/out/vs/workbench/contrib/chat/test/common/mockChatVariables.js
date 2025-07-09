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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrQ2hhdFZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxNQUFNLE9BQU8sd0JBQXdCO0lBR3BDLG1CQUFtQixDQUFDLFNBQWlCO1FBQ3BDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQTBCLEVBQUUsd0JBQWlFO1FBQzdHLE9BQU87WUFDTixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUM7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQVksRUFBRSxLQUFjLEVBQUUsUUFBMkI7UUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9
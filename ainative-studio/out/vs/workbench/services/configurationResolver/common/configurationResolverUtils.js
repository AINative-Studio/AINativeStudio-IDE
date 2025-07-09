/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
export function applyDeprecatedVariableMessage(schema) {
    schema.pattern = schema.pattern || '^(?!.*\\$\\{(env|config|command)\\.)';
    schema.patternErrorMessage = schema.patternErrorMessage ||
        nls.localize('deprecatedVariables', "'env.', 'config.' and 'command.' are deprecated, use 'env:', 'config:' and 'command:' instead.");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9jb21tb24vY29uZmlndXJhdGlvblJlc29sdmVyVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxNQUFNLFVBQVUsOEJBQThCLENBQUMsTUFBbUI7SUFDakUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLHNDQUFzQyxDQUFDO0lBQzFFLE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsbUJBQW1CO1FBQ3RELEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0dBQWdHLENBQUMsQ0FBQztBQUN4SSxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URITransformer } from '../../../base/common/uriIpc.js';
/**
 * ```
 * --------------------------------
 * |    UI SIDE    |  AGENT SIDE  |
 * |---------------|--------------|
 * | vscode-remote | file         |
 * | file          | vscode-local |
 * --------------------------------
 * ```
 */
function createRawURITransformer(remoteAuthority) {
    return {
        transformIncoming: (uri) => {
            if (uri.scheme === 'vscode-remote') {
                return { scheme: 'file', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            if (uri.scheme === 'file') {
                return { scheme: 'vscode-local', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            return uri;
        },
        transformOutgoing: (uri) => {
            if (uri.scheme === 'file') {
                return { scheme: 'vscode-remote', authority: remoteAuthority, path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            if (uri.scheme === 'vscode-local') {
                return { scheme: 'file', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            return uri;
        },
        transformOutgoingScheme: (scheme) => {
            if (scheme === 'file') {
                return 'vscode-remote';
            }
            else if (scheme === 'vscode-local') {
                return 'file';
            }
            return scheme;
        }
    };
}
export function createURITransformer(remoteAuthority) {
    return new URITransformer(createRawURITransformer(remoteAuthority));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL3VyaVRyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0MsY0FBYyxFQUFtQixNQUFNLGdDQUFnQyxDQUFDO0FBRS9HOzs7Ozs7Ozs7R0FTRztBQUNILFNBQVMsdUJBQXVCLENBQUMsZUFBdUI7SUFDdkQsT0FBTztRQUNOLGlCQUFpQixFQUFFLENBQUMsR0FBYSxFQUFZLEVBQUU7WUFDOUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JGLENBQUM7WUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0YsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ1osQ0FBQztRQUNELGlCQUFpQixFQUFFLENBQUMsR0FBYSxFQUFZLEVBQUU7WUFDOUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUgsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyRixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBQ0QsdUJBQXVCLEVBQUUsQ0FBQyxNQUFjLEVBQVUsRUFBRTtZQUNuRCxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxlQUFlLENBQUM7WUFDeEIsQ0FBQztpQkFBTSxJQUFJLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsZUFBdUI7SUFDM0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUMifQ==
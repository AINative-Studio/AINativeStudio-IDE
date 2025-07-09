/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findNodeAtLocation, parseTree as jsonParseTree } from '../../../../base/common/json.js';
export const getMcpServerMapping = (opts) => {
    const tree = jsonParseTree(opts.model.getValue());
    const servers = findNodeAtLocation(tree, opts.pathToServers);
    if (!servers || servers.type !== 'object') {
        return new Map();
    }
    const result = new Map();
    for (const node of servers.children || []) {
        if (node.type !== 'property' || node.children?.[0]?.type !== 'string') {
            continue;
        }
        const start = opts.model.getPositionAt(node.offset);
        const end = opts.model.getPositionAt(node.offset + node.length);
        result.set(node.children[0].value, {
            uri: opts.model.uri,
            range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
            }
        });
    }
    return result;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlnRmlsZVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29uZmlnRmlsZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxTQUFTLElBQUksYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJakcsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxJQUluQyxFQUF5QixFQUFFO0lBQzNCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3RCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDM0MsT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztJQUMzQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZFLFNBQVM7UUFDVixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFDbEMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRztZQUNuQixLQUFLLEVBQUU7Z0JBQ04sZUFBZSxFQUFFLEtBQUssQ0FBQyxVQUFVO2dCQUNqQyxXQUFXLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3pCLGFBQWEsRUFBRSxHQUFHLENBQUMsVUFBVTtnQkFDN0IsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNO2FBQ3JCO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDIn0=
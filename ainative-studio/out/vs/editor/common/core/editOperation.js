/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from './range.js';
export class EditOperation {
    static insert(position, text) {
        return {
            range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: text,
            forceMoveMarkers: true
        };
    }
    static delete(range) {
        return {
            range: range,
            text: null
        };
    }
    static replace(range, text) {
        return {
            range: range,
            text: text
        };
    }
    static replaceMove(range, text) {
        return {
            range: range,
            text: text,
            forceMoveMarkers: true
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdE9wZXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvZWRpdE9wZXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBc0IzQyxNQUFNLE9BQU8sYUFBYTtJQUVsQixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQWtCLEVBQUUsSUFBWTtRQUNwRCxPQUFPO1lBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDNUYsSUFBSSxFQUFFLElBQUk7WUFDVixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFZO1FBQ2hDLE9BQU87WUFDTixLQUFLLEVBQUUsS0FBSztZQUNaLElBQUksRUFBRSxJQUFJO1NBQ1YsQ0FBQztJQUNILENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQVksRUFBRSxJQUFtQjtRQUN0RCxPQUFPO1lBQ04sS0FBSyxFQUFFLEtBQUs7WUFDWixJQUFJLEVBQUUsSUFBSTtTQUNWLENBQUM7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFZLEVBQUUsSUFBbUI7UUFDMUQsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==
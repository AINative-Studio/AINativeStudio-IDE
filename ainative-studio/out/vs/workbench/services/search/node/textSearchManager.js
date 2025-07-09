/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toCanonicalName } from '../../textfile/common/encoding.js';
import * as pfs from '../../../../base/node/pfs.js';
import { TextSearchManager } from '../common/textSearchManager.js';
export class NativeTextSearchManager extends TextSearchManager {
    constructor(query, provider, _pfs = pfs, processType = 'searchProcess') {
        super({ query, provider }, {
            readdir: resource => _pfs.Promises.readdir(resource.fsPath),
            toCanonicalName: name => toCanonicalName(name)
        }, processType);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3RleHRTZWFyY2hNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBR3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW5FLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxpQkFBaUI7SUFFN0QsWUFBWSxLQUFpQixFQUFFLFFBQTZCLEVBQUUsT0FBbUIsR0FBRyxFQUFFLGNBQXdDLGVBQWU7UUFDNUksS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFCLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDM0QsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztTQUM5QyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2pCLENBQUM7Q0FDRCJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export class ExtensionRecommendations extends Disposable {
    constructor() {
        super(...arguments);
        this._activationPromise = null;
    }
    get activated() { return this._activationPromise !== null; }
    activate() {
        if (!this._activationPromise) {
            this._activationPromise = this.doActivate();
        }
        return this._activationPromise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBZ0JsRSxNQUFNLE9BQWdCLHdCQUF5QixTQUFRLFVBQVU7SUFBakU7O1FBS1MsdUJBQWtCLEdBQXlCLElBQUksQ0FBQztJQVN6RCxDQUFDO0lBUkEsSUFBSSxTQUFTLEtBQWMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRSxRQUFRO1FBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDN0MsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ2hDLENBQUM7Q0FFRCJ9
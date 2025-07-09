/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class InternalEditorAction {
    constructor(id, label, alias, metadata, _precondition, _run, _contextKeyService) {
        this.id = id;
        this.label = label;
        this.alias = alias;
        this.metadata = metadata;
        this._precondition = _precondition;
        this._run = _run;
        this._contextKeyService = _contextKeyService;
    }
    isSupported() {
        return this._contextKeyService.contextMatchesRules(this._precondition);
    }
    run(args) {
        if (!this.isSupported()) {
            return Promise.resolve(undefined);
        }
        return this._run(args);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZWRpdG9yQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxvQkFBb0I7SUFFaEMsWUFDaUIsRUFBVSxFQUNWLEtBQWEsRUFDYixLQUFhLEVBQ2IsUUFBc0MsRUFDckMsYUFBK0MsRUFDL0MsSUFBc0MsRUFDdEMsa0JBQXNDO1FBTnZDLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGFBQVEsR0FBUixRQUFRLENBQThCO1FBQ3JDLGtCQUFhLEdBQWIsYUFBYSxDQUFrQztRQUMvQyxTQUFJLEdBQUosSUFBSSxDQUFrQztRQUN0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO0lBQ3BELENBQUM7SUFFRSxXQUFXO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRU0sR0FBRyxDQUFDLElBQWE7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FDRCJ9
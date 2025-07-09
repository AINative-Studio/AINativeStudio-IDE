/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as resources from '../../../../base/common/resources.js';
export class TMScopeRegistry {
    constructor() {
        this._scopeNameToLanguageRegistration = Object.create(null);
    }
    reset() {
        this._scopeNameToLanguageRegistration = Object.create(null);
    }
    register(def) {
        if (this._scopeNameToLanguageRegistration[def.scopeName]) {
            const existingRegistration = this._scopeNameToLanguageRegistration[def.scopeName];
            if (!resources.isEqual(existingRegistration.location, def.location)) {
                console.warn(`Overwriting grammar scope name to file mapping for scope ${def.scopeName}.\n` +
                    `Old grammar file: ${existingRegistration.location.toString()}.\n` +
                    `New grammar file: ${def.location.toString()}`);
            }
        }
        this._scopeNameToLanguageRegistration[def.scopeName] = def;
    }
    getGrammarDefinition(scopeName) {
        return this._scopeNameToLanguageRegistration[scopeName] || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1TY29wZVJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9jb21tb24vVE1TY29wZVJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUF3QmxFLE1BQU0sT0FBTyxlQUFlO0lBSTNCO1FBQ0MsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRU0sUUFBUSxDQUFDLEdBQTRCO1FBQzNDLElBQUksSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsRixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLE9BQU8sQ0FBQyxJQUFJLENBQ1gsNERBQTRELEdBQUcsQ0FBQyxTQUFTLEtBQUs7b0JBQzlFLHFCQUFxQixvQkFBb0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUs7b0JBQ2xFLHFCQUFxQixHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQzlDLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzVELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxTQUFpQjtRQUM1QyxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDakUsQ0FBQztDQUNEIn0=
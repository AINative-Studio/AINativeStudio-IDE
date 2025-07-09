/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { importAMDNodeModule } from '../../../amdX.js';
export const EDITOR_EXPERIMENTAL_PREFER_TREESITTER = 'editor.experimental.preferTreeSitter';
export const TREESITTER_ALLOWED_SUPPORT = ['css', 'typescript', 'ini', 'regex'];
export const ITreeSitterParserService = createDecorator('treeSitterParserService');
export const ITreeSitterImporter = createDecorator('treeSitterImporter');
export class TreeSitterImporter {
    constructor() { }
    async _getTreeSitterImport() {
        if (!this._treeSitterImport) {
            this._treeSitterImport = await importAMDNodeModule('@vscode/tree-sitter-wasm', 'wasm/tree-sitter.js');
        }
        return this._treeSitterImport;
    }
    get parserClass() {
        return this._parserClass;
    }
    async getParserClass() {
        if (!this._parserClass) {
            this._parserClass = (await this._getTreeSitterImport()).Parser;
        }
        return this._parserClass;
    }
    async getLanguageClass() {
        if (!this._languageClass) {
            this._languageClass = (await this._getTreeSitterImport()).Language;
        }
        return this._languageClass;
    }
    async getQueryClass() {
        if (!this._queryClass) {
            this._queryClass = (await this._getTreeSitterImport()).Query;
        }
        return this._queryClass;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90cmVlU2l0dGVyUGFyc2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHdkQsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsc0NBQXNDLENBQUM7QUFDNUYsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUVoRixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUM7QUFvRTdHLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQVU5RixNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLGdCQUFnQixDQUFDO0lBRVQsS0FBSyxDQUFDLG9CQUFvQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sbUJBQW1CLENBQTRDLDBCQUEwQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDbEosQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUdNLEtBQUssQ0FBQyxjQUFjO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDaEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBR00sS0FBSyxDQUFDLGdCQUFnQjtRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ3BFLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUdNLEtBQUssQ0FBQyxhQUFhO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDOUQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0NBQ0QifQ==
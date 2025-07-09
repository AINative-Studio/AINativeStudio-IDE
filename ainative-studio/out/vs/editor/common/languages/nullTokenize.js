/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Token, TokenizationResult, EncodedTokenizationResult } from '../languages.js';
export const NullState = new class {
    clone() {
        return this;
    }
    equals(other) {
        return (this === other);
    }
};
export function nullTokenize(languageId, state) {
    return new TokenizationResult([new Token(0, '', languageId)], state);
}
export function nullTokenizeEncoded(languageId, state) {
    const tokens = new Uint32Array(2);
    tokens[0] = 0;
    tokens[1] = ((languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
        | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
        | (0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
        | (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
        | (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>> 0;
    return new EncodedTokenizationResult(tokens, state === null ? NullState : state);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbFRva2VuaXplLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL251bGxUb2tlbml6ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLHlCQUF5QixFQUFVLE1BQU0saUJBQWlCLENBQUM7QUFHL0YsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFXLElBQUk7SUFDN0IsS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNNLE1BQU0sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUM7SUFDekIsQ0FBQztDQUNELENBQUM7QUFFRixNQUFNLFVBQVUsWUFBWSxDQUFDLFVBQWtCLEVBQUUsS0FBYTtJQUM3RCxPQUFPLElBQUksa0JBQWtCLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdEUsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxVQUFzQixFQUFFLEtBQW9CO0lBQy9FLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDZCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDWCxDQUFDLFVBQVUsNENBQW9DLENBQUM7VUFDOUMsQ0FBQywyRUFBMkQsQ0FBQztVQUM3RCxDQUFDLG1FQUFrRCxDQUFDO1VBQ3BELENBQUMsOEVBQTZELENBQUM7VUFDL0QsQ0FBQyw4RUFBNkQsQ0FBQyxDQUNqRSxLQUFLLENBQUMsQ0FBQztJQUVSLE9BQU8sSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRixDQUFDIn0=
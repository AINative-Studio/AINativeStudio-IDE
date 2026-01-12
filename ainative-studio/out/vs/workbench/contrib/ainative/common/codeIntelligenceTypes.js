/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Code intelligence error codes
 */
export var CodeIntelligenceErrorCode;
(function (CodeIntelligenceErrorCode) {
    /**
     * Language not supported
     */
    CodeIntelligenceErrorCode["UnsupportedLanguage"] = "UNSUPPORTED_LANGUAGE";
    /**
     * Parsing failed
     */
    CodeIntelligenceErrorCode["ParseError"] = "PARSE_ERROR";
    /**
     * Symbol not found
     */
    CodeIntelligenceErrorCode["SymbolNotFound"] = "SYMBOL_NOT_FOUND";
    /**
     * API request failed
     */
    CodeIntelligenceErrorCode["APIError"] = "API_ERROR";
    /**
     * Unknown error
     */
    CodeIntelligenceErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(CodeIntelligenceErrorCode || (CodeIntelligenceErrorCode = {}));
/**
 * Code intelligence error
 */
export class CodeIntelligenceError extends Error {
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'CodeIntelligenceError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUludGVsbGlnZW5jZVR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vY29kZUludGVsbGlnZW5jZVR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBMFhoRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHlCQXlCWDtBQXpCRCxXQUFZLHlCQUF5QjtJQUNwQzs7T0FFRztJQUNILHlFQUE0QyxDQUFBO0lBRTVDOztPQUVHO0lBQ0gsdURBQTBCLENBQUE7SUFFMUI7O09BRUc7SUFDSCxnRUFBbUMsQ0FBQTtJQUVuQzs7T0FFRztJQUNILG1EQUFzQixDQUFBO0lBRXRCOztPQUVHO0lBQ0gsMkRBQThCLENBQUE7QUFDL0IsQ0FBQyxFQXpCVyx5QkFBeUIsS0FBekIseUJBQXlCLFFBeUJwQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLEtBQUs7SUFDL0MsWUFDaUIsSUFBK0IsRUFDL0MsT0FBZSxFQUNDLGFBQXFCO1FBRXJDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUpDLFNBQUksR0FBSixJQUFJLENBQTJCO1FBRS9CLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBR3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsdUJBQXVCLENBQUM7SUFDckMsQ0FBQztDQUNEIn0=
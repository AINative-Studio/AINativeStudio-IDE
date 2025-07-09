/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// First group matches a double quoted string
// Second group matches a single quoted string
// Third group matches a multi line comment
// Forth group matches a single line comment
// Fifth group matches a trailing comma
const regexp = /("[^"\\]*(?:\\.[^"\\]*)*")|('[^'\\]*(?:\\.[^'\\]*)*')|(\/\*[^\/\*]*(?:(?:\*|\/)[^\/\*]*)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))|(,\s*[}\]])/g;
/**
 * Strips single and multi line JavaScript comments from JSON
 * content. Ignores characters in strings BUT doesn't support
 * string continuation across multiple lines since it is not
 * supported in JSON.
 *
 * @param content the content to strip comments from
 * @returns the content without comments
*/
export function stripComments(content) {
    return content.replace(regexp, function (match, _m1, _m2, m3, m4, m5) {
        // Only one of m1, m2, m3, m4, m5 matches
        if (m3) {
            // A block comment. Replace with nothing
            return '';
        }
        else if (m4) {
            // Since m4 is a single line comment is is at least of length 2 (e.g. //)
            // If it ends in \r?\n then keep it.
            const length = m4.length;
            if (m4[length - 1] === '\n') {
                return m4[length - 2] === '\r' ? '\r\n' : '\n';
            }
            else {
                return '';
            }
        }
        else if (m5) {
            // Remove the trailing comma
            return match.substring(1);
        }
        else {
            // We match a string
            return match;
        }
    });
}
/**
 * A drop-in replacement for JSON.parse that can parse
 * JSON with comments and trailing commas.
 *
 * @param content the content to strip comments from
 * @returns the parsed content as JSON
*/
export function parse(content) {
    const commentsStripped = stripComments(content);
    try {
        return JSON.parse(commentsStripped);
    }
    catch (error) {
        const trailingCommasStriped = commentsStripped.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(trailingCommasStriped);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsNkNBQTZDO0FBQzdDLDhDQUE4QztBQUM5QywyQ0FBMkM7QUFDM0MsNENBQTRDO0FBQzVDLHVDQUF1QztBQUN2QyxNQUFNLE1BQU0sR0FBRyx5SUFBeUksQ0FBQztBQUV6Sjs7Ozs7Ozs7RUFRRTtBQUNGLE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBZTtJQUM1QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO1FBQ25FLHlDQUF5QztRQUN6QyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1Isd0NBQXdDO1lBQ3hDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQzthQUFNLElBQUksRUFBRSxFQUFFLENBQUM7WUFDZix5RUFBeUU7WUFDekUsb0NBQW9DO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDekIsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM3QixPQUFPLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNoRCxDQUFDO2lCQUNJLENBQUM7Z0JBQ0wsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksRUFBRSxFQUFFLENBQUM7WUFDZiw0QkFBNEI7WUFDNUIsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLENBQUM7YUFBTSxDQUFDO1lBQ1Asb0JBQW9CO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7Ozs7RUFNRTtBQUNGLE1BQU0sVUFBVSxLQUFLLENBQUksT0FBZTtJQUN2QyxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVoRCxJQUFJLENBQUM7UUFDSixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixNQUFNLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0UsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDMUMsQ0FBQztBQUNGLENBQUMifQ==
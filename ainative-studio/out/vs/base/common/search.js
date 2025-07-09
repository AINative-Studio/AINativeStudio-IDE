/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from './strings.js';
export function buildReplaceStringWithCasePreserved(matches, pattern) {
    if (matches && (matches[0] !== '')) {
        const containsHyphens = validateSpecificSpecialCharacter(matches, pattern, '-');
        const containsUnderscores = validateSpecificSpecialCharacter(matches, pattern, '_');
        if (containsHyphens && !containsUnderscores) {
            return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, '-');
        }
        else if (!containsHyphens && containsUnderscores) {
            return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, '_');
        }
        if (matches[0].toUpperCase() === matches[0]) {
            return pattern.toUpperCase();
        }
        else if (matches[0].toLowerCase() === matches[0]) {
            return pattern.toLowerCase();
        }
        else if (strings.containsUppercaseCharacter(matches[0][0]) && pattern.length > 0) {
            return pattern[0].toUpperCase() + pattern.substr(1);
        }
        else if (matches[0][0].toUpperCase() !== matches[0][0] && pattern.length > 0) {
            return pattern[0].toLowerCase() + pattern.substr(1);
        }
        else {
            // we don't understand its pattern yet.
            return pattern;
        }
    }
    else {
        return pattern;
    }
}
function validateSpecificSpecialCharacter(matches, pattern, specialCharacter) {
    const doesContainSpecialCharacter = matches[0].indexOf(specialCharacter) !== -1 && pattern.indexOf(specialCharacter) !== -1;
    return doesContainSpecialCharacter && matches[0].split(specialCharacter).length === pattern.split(specialCharacter).length;
}
function buildReplaceStringForSpecificSpecialCharacter(matches, pattern, specialCharacter) {
    const splitPatternAtSpecialCharacter = pattern.split(specialCharacter);
    const splitMatchAtSpecialCharacter = matches[0].split(specialCharacter);
    let replaceString = '';
    splitPatternAtSpecialCharacter.forEach((splitValue, index) => {
        replaceString += buildReplaceStringWithCasePreserved([splitMatchAtSpecialCharacter[index]], splitValue) + specialCharacter;
    });
    return replaceString.slice(0, -1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3NlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUV4QyxNQUFNLFVBQVUsbUNBQW1DLENBQUMsT0FBd0IsRUFBRSxPQUFlO0lBQzVGLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDcEMsTUFBTSxlQUFlLEdBQUcsZ0NBQWdDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoRixNQUFNLG1CQUFtQixHQUFHLGdDQUFnQyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEYsSUFBSSxlQUFlLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzdDLE9BQU8sNkNBQTZDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3RSxDQUFDO2FBQU0sSUFBSSxDQUFDLGVBQWUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3BELE9BQU8sNkNBQTZDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDOUIsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlCLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BGLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hGLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCx1Q0FBdUM7WUFDdkMsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGdDQUFnQyxDQUFDLE9BQWlCLEVBQUUsT0FBZSxFQUFFLGdCQUF3QjtJQUNyRyxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDNUgsT0FBTywyQkFBMkIsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDNUgsQ0FBQztBQUVELFNBQVMsNkNBQTZDLENBQUMsT0FBaUIsRUFBRSxPQUFlLEVBQUUsZ0JBQXdCO0lBQ2xILE1BQU0sOEJBQThCLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sNEJBQTRCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hFLElBQUksYUFBYSxHQUFXLEVBQUUsQ0FBQztJQUMvQiw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDNUQsYUFBYSxJQUFJLG1DQUFtQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1SCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDIn0=
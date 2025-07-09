/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from './strings.js';
var Severity;
(function (Severity) {
    Severity[Severity["Ignore"] = 0] = "Ignore";
    Severity[Severity["Info"] = 1] = "Info";
    Severity[Severity["Warning"] = 2] = "Warning";
    Severity[Severity["Error"] = 3] = "Error";
})(Severity || (Severity = {}));
(function (Severity) {
    const _error = 'error';
    const _warning = 'warning';
    const _warn = 'warn';
    const _info = 'info';
    const _ignore = 'ignore';
    /**
     * Parses 'error', 'warning', 'warn', 'info' in call casings
     * and falls back to ignore.
     */
    function fromValue(value) {
        if (!value) {
            return Severity.Ignore;
        }
        if (strings.equalsIgnoreCase(_error, value)) {
            return Severity.Error;
        }
        if (strings.equalsIgnoreCase(_warning, value) || strings.equalsIgnoreCase(_warn, value)) {
            return Severity.Warning;
        }
        if (strings.equalsIgnoreCase(_info, value)) {
            return Severity.Info;
        }
        return Severity.Ignore;
    }
    Severity.fromValue = fromValue;
    function toString(severity) {
        switch (severity) {
            case Severity.Error: return _error;
            case Severity.Warning: return _warning;
            case Severity.Info: return _info;
            default: return _ignore;
        }
    }
    Severity.toString = toString;
})(Severity || (Severity = {}));
export default Severity;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc2V2ZXJpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFFeEMsSUFBSyxRQUtKO0FBTEQsV0FBSyxRQUFRO0lBQ1osMkNBQVUsQ0FBQTtJQUNWLHVDQUFRLENBQUE7SUFDUiw2Q0FBVyxDQUFBO0lBQ1gseUNBQVMsQ0FBQTtBQUNWLENBQUMsRUFMSSxRQUFRLEtBQVIsUUFBUSxRQUtaO0FBRUQsV0FBVSxRQUFRO0lBRWpCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztJQUN2QixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDM0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQztJQUNyQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUM7SUFFekI7OztPQUdHO0lBQ0gsU0FBZ0IsU0FBUyxDQUFDLEtBQWE7UUFDdEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekYsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDO0lBakJlLGtCQUFTLFlBaUJ4QixDQUFBO0lBRUQsU0FBZ0IsUUFBUSxDQUFDLFFBQWtCO1FBQzFDLFFBQVEsUUFBUSxFQUFFLENBQUM7WUFDbEIsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUM7WUFDbkMsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUM7WUFDdkMsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUM7WUFDakMsT0FBTyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFQZSxpQkFBUSxXQU92QixDQUFBO0FBQ0YsQ0FBQyxFQXZDUyxRQUFRLEtBQVIsUUFBUSxRQXVDakI7QUFFRCxlQUFlLFFBQVEsQ0FBQyJ9
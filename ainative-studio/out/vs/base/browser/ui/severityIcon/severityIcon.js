/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/severityIcon.css';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import Severity from '../../../common/severity.js';
export var SeverityIcon;
(function (SeverityIcon) {
    function className(severity) {
        switch (severity) {
            case Severity.Ignore:
                return 'severity-ignore ' + ThemeIcon.asClassName(Codicon.info);
            case Severity.Info:
                return ThemeIcon.asClassName(Codicon.info);
            case Severity.Warning:
                return ThemeIcon.asClassName(Codicon.warning);
            case Severity.Error:
                return ThemeIcon.asClassName(Codicon.error);
            default:
                return '';
        }
    }
    SeverityIcon.className = className;
})(SeverityIcon || (SeverityIcon = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHlJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zZXZlcml0eUljb24vc2V2ZXJpdHlJY29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQztBQUVuRCxNQUFNLEtBQVcsWUFBWSxDQWdCNUI7QUFoQkQsV0FBaUIsWUFBWTtJQUU1QixTQUFnQixTQUFTLENBQUMsUUFBa0I7UUFDM0MsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQixLQUFLLFFBQVEsQ0FBQyxNQUFNO2dCQUNuQixPQUFPLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pFLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2pCLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsS0FBSyxRQUFRLENBQUMsT0FBTztnQkFDcEIsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdDO2dCQUNDLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFiZSxzQkFBUyxZQWF4QixDQUFBO0FBQ0YsQ0FBQyxFQWhCZ0IsWUFBWSxLQUFaLFlBQVksUUFnQjVCIn0=
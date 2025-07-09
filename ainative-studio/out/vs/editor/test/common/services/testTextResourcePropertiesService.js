/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as platform from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let TestTextResourcePropertiesService = class TestTextResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return (platform.isLinux || platform.isMacintosh) ? '\n' : '\r\n';
    }
};
TestTextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], TestTextResourcePropertiesService);
export { TestTextResourcePropertiesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRleHRSZXNvdXJjZVByb3BlcnRpZXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy90ZXN0VGV4dFJlc291cmNlUHJvcGVydGllc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU1RixJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFpQztJQUk3QyxZQUN5QyxvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUVwRixDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQWEsRUFBRSxRQUFpQjtRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3hHLElBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEQsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBQ0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNuRSxDQUFDO0NBQ0QsQ0FBQTtBQWhCWSxpQ0FBaUM7SUFLM0MsV0FBQSxxQkFBcUIsQ0FBQTtHQUxYLGlDQUFpQyxDQWdCN0MifQ==
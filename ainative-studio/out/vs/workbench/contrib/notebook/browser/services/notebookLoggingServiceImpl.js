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
import * as nls from '../../../../../nls.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILoggerService } from '../../../../../platform/log/common/log.js';
import { windowLogGroup } from '../../../../services/log/common/logConstants.js';
const logChannelId = 'notebook.rendering';
let NotebookLoggingService = class NotebookLoggingService extends Disposable {
    static { this.ID = 'notebook'; }
    constructor(loggerService) {
        super();
        this._logger = this._register(loggerService.createLogger(logChannelId, { name: nls.localize('renderChannelName', "Notebook"), group: windowLogGroup }));
    }
    debug(category, output) {
        this._logger.debug(`[${category}] ${output}`);
    }
    info(category, output) {
        this._logger.info(`[${category}] ${output}`);
    }
    warn(category, output) {
        this._logger.warn(`[${category}] ${output}`);
    }
    error(category, output) {
        this._logger.error(`[${category}] ${output}`);
    }
};
NotebookLoggingService = __decorate([
    __param(0, ILoggerService)
], NotebookLoggingService);
export { NotebookLoggingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tMb2dnaW5nU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0xvZ2dpbmdTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWpGLE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDO0FBRW5DLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTthQUc5QyxPQUFFLEdBQVcsVUFBVSxBQUFyQixDQUFzQjtJQUcvQixZQUNpQixhQUE2QjtRQUU3QyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekosQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFnQixFQUFFLE1BQWM7UUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSSxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsUUFBZ0IsRUFBRSxNQUFjO1FBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFnQixFQUFFLE1BQWM7UUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDOztBQTNCVyxzQkFBc0I7SUFPaEMsV0FBQSxjQUFjLENBQUE7R0FQSixzQkFBc0IsQ0E0QmxDIn0=
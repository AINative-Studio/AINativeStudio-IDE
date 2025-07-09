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
import { ILoggerService, log } from '../../../../platform/log/common/log.js';
let DelayedLogChannel = class DelayedLogChannel {
    constructor(id, name, file, loggerService) {
        this.file = file;
        this.loggerService = loggerService;
        this.logger = loggerService.createLogger(file, { name, id, hidden: true });
    }
    log(level, message) {
        this.loggerService.setVisibility(this.file, true);
        log(this.logger, level, message);
    }
};
DelayedLogChannel = __decorate([
    __param(3, ILoggerService)
], DelayedLogChannel);
export { DelayedLogChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsYXllZExvZ0NoYW5uZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL291dHB1dC9jb21tb24vZGVsYXllZExvZ0NoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFXLGNBQWMsRUFBRSxHQUFHLEVBQVksTUFBTSx3Q0FBd0MsQ0FBQztBQUd6RixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjtJQUk3QixZQUNDLEVBQVUsRUFBRSxJQUFZLEVBQW1CLElBQVMsRUFDbkIsYUFBNkI7UUFEbkIsU0FBSSxHQUFKLElBQUksQ0FBSztRQUNuQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFFOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUVELEdBQUcsQ0FBQyxLQUFlLEVBQUUsT0FBZTtRQUNuQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsQyxDQUFDO0NBRUQsQ0FBQTtBQWhCWSxpQkFBaUI7SUFNM0IsV0FBQSxjQUFjLENBQUE7R0FOSixpQkFBaUIsQ0FnQjdCIn0=
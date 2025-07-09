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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Schemas } from '../../../base/common/network.js';
import { IFileService } from '../../files/common/files.js';
import { asTextOrError, IRequestService } from '../../request/common/request.js';
let DownloadService = class DownloadService {
    constructor(requestService, fileService) {
        this.requestService = requestService;
        this.fileService = fileService;
    }
    async download(resource, target, cancellationToken = CancellationToken.None) {
        if (resource.scheme === Schemas.file || resource.scheme === Schemas.vscodeRemote) {
            // Intentionally only support this for file|remote<->file|remote scenarios
            await this.fileService.copy(resource, target);
            return;
        }
        const options = { type: 'GET', url: resource.toString(true) };
        const context = await this.requestService.request(options, cancellationToken);
        if (context.res.statusCode === 200) {
            await this.fileService.writeFile(target, context.stream);
        }
        else {
            const message = await asTextOrError(context);
            throw new Error(`Expected 200, got back ${context.res.statusCode} instead.\n\n${message}`);
        }
    }
};
DownloadService = __decorate([
    __param(0, IRequestService),
    __param(1, IFileService)
], DownloadService);
export { DownloadService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Rvd25sb2FkL2NvbW1vbi9kb3dubG9hZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFFLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFJM0IsWUFDbUMsY0FBK0IsRUFDbEMsV0FBeUI7UUFEdEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2xDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3JELENBQUM7SUFFTCxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWEsRUFBRSxNQUFXLEVBQUUsb0JBQXVDLGlCQUFpQixDQUFDLElBQUk7UUFDdkcsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEYsMEVBQTBFO1lBQzFFLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDOUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM5RSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sT0FBTyxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxnQkFBZ0IsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1RixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF4QlksZUFBZTtJQUt6QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsWUFBWSxDQUFBO0dBTkYsZUFBZSxDQXdCM0IifQ==
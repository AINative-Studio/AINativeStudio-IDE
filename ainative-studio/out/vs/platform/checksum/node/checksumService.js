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
import { createHash } from 'crypto';
import { listenStream } from '../../../base/common/stream.js';
import { IFileService } from '../../files/common/files.js';
let ChecksumService = class ChecksumService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async checksum(resource) {
        const stream = (await this.fileService.readFileStream(resource)).value;
        return new Promise((resolve, reject) => {
            const hash = createHash('sha256');
            listenStream(stream, {
                onData: data => hash.update(data.buffer),
                onError: error => reject(error),
                onEnd: () => resolve(hash.digest('base64').replace(/=+$/, ''))
            });
        });
    }
};
ChecksumService = __decorate([
    __param(0, IFileService)
], ChecksumService);
export { ChecksumService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tzdW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NoZWNrc3VtL25vZGUvY2hlY2tzdW1TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVwRCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBSTNCLFlBQTJDLFdBQXlCO1FBQXpCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQUksQ0FBQztJQUV6RSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWE7UUFDM0IsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZFLE9BQU8sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUMsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRWxDLFlBQVksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BCLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDeEMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDL0IsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDOUQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQWxCWSxlQUFlO0lBSWQsV0FBQSxZQUFZLENBQUE7R0FKYixlQUFlLENBa0IzQiJ9
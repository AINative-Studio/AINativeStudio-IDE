/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir, tmpdir } from 'os';
import { AbstractNativeEnvironmentService, parseDebugParams } from '../common/environmentService.js';
import { getUserDataPath } from './userDataPath.js';
export class NativeEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(args, productService) {
        super(args, {
            homeDir: homedir(),
            tmpDir: tmpdir(),
            userDataDir: getUserDataPath(args, productService.nameShort)
        }, productService);
    }
}
export function parsePtyHostDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-ptyhost'], args['inspect-brk-ptyhost'], 5877, isBuilt, args.extensionEnvironment);
}
export function parseSharedProcessDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-sharedprocess'], args['inspect-brk-sharedprocess'], 5879, isBuilt, args.extensionEnvironment);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBR3JDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUdwRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsZ0NBQWdDO0lBRTdFLFlBQVksSUFBc0IsRUFBRSxjQUErQjtRQUNsRSxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ1gsT0FBTyxFQUFFLE9BQU8sRUFBRTtZQUNsQixNQUFNLEVBQUUsTUFBTSxFQUFFO1lBQ2hCLFdBQVcsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUM7U0FDNUQsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsSUFBc0IsRUFBRSxPQUFnQjtJQUM3RSxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDekgsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxJQUFzQixFQUFFLE9BQWdCO0lBQ25GLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNySSxDQUFDIn0=
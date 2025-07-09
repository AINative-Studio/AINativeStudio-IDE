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
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
let Breakpoints = class Breakpoints {
    constructor(breakpointContribution, contextKeyService) {
        this.breakpointContribution = breakpointContribution;
        this.contextKeyService = contextKeyService;
        this.breakpointsWhen = typeof breakpointContribution.when === 'string' ? ContextKeyExpr.deserialize(breakpointContribution.when) : undefined;
    }
    get language() {
        return this.breakpointContribution.language;
    }
    get enabled() {
        return !this.breakpointsWhen || this.contextKeyService.contextMatchesRules(this.breakpointsWhen);
    }
};
Breakpoints = __decorate([
    __param(1, IContextKeyService)
], Breakpoints);
export { Breakpoints };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2JyZWFrcG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHekgsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVztJQUl2QixZQUNrQixzQkFBK0MsRUFDM0IsaUJBQXFDO1FBRHpELDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDM0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUUxRSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sc0JBQXNCLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQzlJLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7SUFDN0MsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEcsQ0FBQztDQUNELENBQUE7QUFsQlksV0FBVztJQU1yQixXQUFBLGtCQUFrQixDQUFBO0dBTlIsV0FBVyxDQWtCdkIifQ==
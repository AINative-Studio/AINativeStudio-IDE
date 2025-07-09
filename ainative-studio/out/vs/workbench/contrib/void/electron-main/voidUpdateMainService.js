/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
let VoidMainUpdateService = class VoidMainUpdateService extends Disposable {
    constructor(_productService, _envMainService, _updateService) {
        super();
        this._productService = _productService;
        this._envMainService = _envMainService;
        this._updateService = _updateService;
    }
    async check(explicit) {
        const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts
        if (isDevMode) {
            return { message: null };
        }
        // if disabled and not explicitly checking, return early
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            if (!explicit)
                return { message: null };
        }
        this._updateService.checkForUpdates(false); // implicity check, then handle result ourselves
        console.log('updateState', this._updateService.state);
        if (this._updateService.state.type === "uninitialized" /* StateType.Uninitialized */) {
            // The update service hasn't been initialized yet
            return { message: explicit ? 'Checking for updates soon...' : null, action: explicit ? 'reinstall' : undefined };
        }
        if (this._updateService.state.type === "idle" /* StateType.Idle */) {
            // No updates currently available
            return { message: explicit ? 'No updates found!' : null, action: explicit ? 'reinstall' : undefined };
        }
        if (this._updateService.state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
            // Currently checking for updates
            return { message: explicit ? 'Checking for updates...' : null };
        }
        if (this._updateService.state.type === "available for download" /* StateType.AvailableForDownload */) {
            // Update available but requires manual download (mainly for Linux)
            return { message: 'A new update is available!', action: 'download', };
        }
        if (this._updateService.state.type === "downloading" /* StateType.Downloading */) {
            // Update is currently being downloaded
            return { message: explicit ? 'Currently downloading update...' : null };
        }
        if (this._updateService.state.type === "downloaded" /* StateType.Downloaded */) {
            // Update has been downloaded but not yet ready
            return { message: explicit ? 'An update is ready to be applied!' : null, action: 'apply' };
        }
        if (this._updateService.state.type === "updating" /* StateType.Updating */) {
            // Update is being applied
            return { message: explicit ? 'Applying update...' : null };
        }
        if (this._updateService.state.type === "ready" /* StateType.Ready */) {
            // Update is ready
            return { message: 'Restart Void to update!', action: 'restart' };
        }
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            return await this._manualCheckGHTagIfDisabled(explicit);
        }
        return null;
    }
    async _manualCheckGHTagIfDisabled(explicit) {
        try {
            const response = await fetch('https://api.github.com/repos/voideditor/binaries/releases/latest');
            const data = await response.json();
            const version = data.tag_name;
            const myVersion = this._productService.version;
            const latestVersion = version;
            const isUpToDate = myVersion === latestVersion; // only makes sense if response.ok
            let message;
            let action;
            // explicit
            if (explicit) {
                if (response.ok) {
                    if (!isUpToDate) {
                        message = 'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                        action = 'reinstall';
                    }
                    else {
                        message = 'Void is up-to-date!';
                    }
                }
                else {
                    message = `An error occurred when fetching the latest GitHub release tag. Please try again in ~5 minutes, or reinstall.`;
                    action = 'reinstall';
                }
            }
            // not explicit
            else {
                if (response.ok && !isUpToDate) {
                    message = 'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                    action = 'reinstall';
                }
                else {
                    message = null;
                }
            }
            return { message, action };
        }
        catch (e) {
            if (explicit) {
                return {
                    message: `An error occurred when fetching the latest GitHub release tag: ${e}. Please try again in ~5 minutes.`,
                    action: 'reinstall',
                };
            }
            else {
                return { message: null };
            }
        }
    }
};
VoidMainUpdateService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentMainService),
    __param(2, IUpdateService)
], VoidMainUpdateService);
export { VoidMainUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi92b2lkVXBkYXRlTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFhLE1BQU0sOENBQThDLENBQUM7QUFNbEYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBR3BELFlBQ21DLGVBQWdDLEVBQ3hCLGVBQXdDLEVBQ2pELGNBQThCO1FBRS9ELEtBQUssRUFBRSxDQUFBO1FBSjJCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUN4QixvQkFBZSxHQUFmLGVBQWUsQ0FBeUI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO0lBR2hFLENBQUM7SUFHRCxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQWlCO1FBRTVCLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUEsQ0FBQyxvQ0FBb0M7UUFFcEYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFXLENBQUE7UUFDbEMsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksd0NBQXVCLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsUUFB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
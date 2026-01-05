/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { ISkillConfigService } from './skillConfigServiceTypes.js';
import { SkillConfigService } from './skillConfigService.js';
/**
 * Register skill configuration service as a singleton
 */
registerSingleton(ISkillConfigService, SkillConfigService, 1 /* InstantiationType.Delayed */);
/**
 * Import skill CLI commands (install, uninstall, list)
 */
import './cli/skillCommands.contribution.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzTW9kdWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL3NraWxsc01vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sNERBQTRELENBQUM7QUFDbEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFN0Q7O0dBRUc7QUFDSCxpQkFBaUIsQ0FDaEIsbUJBQW1CLEVBQ25CLGtCQUFrQixvQ0FFbEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsT0FBTyxxQ0FBcUMsQ0FBQyJ9
/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// register inline diffs
import './editCodeService.js';
// register Sidebar pane, state, actions (keybinds, menus) (Ctrl+L)
import './sidebarActions.js';
import './sidebarPane.js';
// register quick edit (Ctrl+K)
import './quickEditActions.js';
// register Autocomplete
import './autocompleteService.js';
// register Context services
// import './contextGatheringService.js'
// import './contextUserChangesService.js'
// settings pane
import './voidSettingsPane.js';
// register css
import './media/void.css';
// update (frontend part, also see platform/)
import './voidUpdateActions.js';
import './convertToLLMMessageWorkbenchContrib.js';
// tools
import './toolsService.js';
import './terminalToolService.js';
// register Thread History
import './chatThreadService.js';
// ping
import './metricsPollService.js';
// helper services
import './helperServices/consistentItemService.js';
// register selection helper
import './voidSelectionHelperWidget.js';
// register tooltip service
import './tooltipService.js';
// register onboarding service
import './voidOnboardingService.js';
// register misc service
import './miscWokrbenchContrib.js';
// register file service (for explorer context menu)
import './fileService.js';
// register source control management
import './voidSCMService.js';
// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------
// llmMessage
import '../common/sendLLMMessageService.js';
// voidSettings
import '../common/voidSettingsService.js';
// refreshModel
import '../common/refreshModelService.js';
// metrics
import '../common/metricsService.js';
// updates
import '../common/voidUpdateService.js';
// model service
import '../common/voidModelService.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUcxRix3QkFBd0I7QUFDeEIsT0FBTyxzQkFBc0IsQ0FBQTtBQUU3QixtRUFBbUU7QUFDbkUsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLGtCQUFrQixDQUFBO0FBRXpCLCtCQUErQjtBQUMvQixPQUFPLHVCQUF1QixDQUFBO0FBRzlCLHdCQUF3QjtBQUN4QixPQUFPLDBCQUEwQixDQUFBO0FBRWpDLDRCQUE0QjtBQUM1Qix3Q0FBd0M7QUFDeEMsMENBQTBDO0FBRTFDLGdCQUFnQjtBQUNoQixPQUFPLHVCQUF1QixDQUFBO0FBRTlCLGVBQWU7QUFDZixPQUFPLGtCQUFrQixDQUFBO0FBRXpCLDZDQUE2QztBQUM3QyxPQUFPLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sMENBQTBDLENBQUE7QUFFakQsUUFBUTtBQUNSLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTywwQkFBMEIsQ0FBQTtBQUVqQywwQkFBMEI7QUFDMUIsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPO0FBQ1AsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyxrQkFBa0I7QUFDbEIsT0FBTywyQ0FBMkMsQ0FBQTtBQUVsRCw0QkFBNEI7QUFDNUIsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUV2QywyQkFBMkI7QUFDM0IsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1Qiw4QkFBOEI7QUFDOUIsT0FBTyw0QkFBNEIsQ0FBQTtBQUVuQyx3QkFBd0I7QUFDeEIsT0FBTywyQkFBMkIsQ0FBQTtBQUVsQyxvREFBb0Q7QUFDcEQsT0FBTyxrQkFBa0IsQ0FBQTtBQUV6QixxQ0FBcUM7QUFDckMsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1Qix1SUFBdUk7QUFFdkksYUFBYTtBQUNiLE9BQU8sb0NBQW9DLENBQUE7QUFFM0MsZUFBZTtBQUNmLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsZUFBZTtBQUNmLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsVUFBVTtBQUNWLE9BQU8sNkJBQTZCLENBQUE7QUFFcEMsVUFBVTtBQUNWLE9BQU8sZ0NBQWdDLENBQUE7QUFFdkMsZ0JBQWdCO0FBQ2hCLE9BQU8sK0JBQStCLENBQUEifQ==
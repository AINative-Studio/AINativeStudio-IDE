/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
import './ainativeSettingsPane.js';
// register css
import './media/ainative.css';
// update (frontend part, also see platform/)
import './ainativeUpdateActions.js';
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
import './ainativeSelectionHelperWidget.js';
// register tooltip service
import './tooltipService.js';
// register onboarding service
import './ainativeOnboardingService.js';
// register misc service
import './miscWokrbenchContrib.js';
// register file service (for explorer context menu)
import './fileService.js';
// register source control management
import './ainativeSCMService.js';
// ---------- common (unclear if these actually need to be imported, because they're already imported wherever they're used) ----------
// llmMessage
import '../common/sendLLMMessageService.js';
// ainativeSettings
import '../common/ainativeSettingsService.js';
// refreshModel
import '../common/refreshModelService.js';
// metrics
import '../common/metricsService.js';
// updates
import '../common/ainativeUpdateService.js';
// model service
import '../common/ainativeModelService.js';
// agent memory service
import '../common/agentMemoryService.js';
// GitHub OAuth service
import '../common/githubOAuthService.js';
// GitHub OAuth URL handler
import './githubOAuthUrlHandler.js';
// Skills configuration service
import '../common/skills/skillsModule.js';
// AI Model Registry service
import '../common/aiModelRegistryService.js';
// AINative Cloud Authentication service
import '../common/ainativeCloudAuthService.js';
// Usage Tracking service
import '../common/usageTrackingService.js';
// AINative Auth service
import '../common/ainativeAuthService.js';
// AINative Cloud Auth service
import '../common/ainativeCloudAuthService.js';
// AINative Cloud Auth UI and commands
import './ainativeAuthActions.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2FpbmF0aXZlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUcxRix3QkFBd0I7QUFDeEIsT0FBTyxzQkFBc0IsQ0FBQTtBQUU3QixtRUFBbUU7QUFDbkUsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLGtCQUFrQixDQUFBO0FBRXpCLCtCQUErQjtBQUMvQixPQUFPLHVCQUF1QixDQUFBO0FBRzlCLHdCQUF3QjtBQUN4QixPQUFPLDBCQUEwQixDQUFBO0FBRWpDLDRCQUE0QjtBQUM1Qix3Q0FBd0M7QUFDeEMsMENBQTBDO0FBRTFDLGdCQUFnQjtBQUNoQixPQUFPLDJCQUEyQixDQUFBO0FBRWxDLGVBQWU7QUFDZixPQUFPLHNCQUFzQixDQUFBO0FBRTdCLDZDQUE2QztBQUM3QyxPQUFPLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sMENBQTBDLENBQUE7QUFFakQsUUFBUTtBQUNSLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTywwQkFBMEIsQ0FBQTtBQUVqQywwQkFBMEI7QUFDMUIsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPO0FBQ1AsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyxrQkFBa0I7QUFDbEIsT0FBTywyQ0FBMkMsQ0FBQTtBQUVsRCw0QkFBNEI7QUFDNUIsT0FBTyxvQ0FBb0MsQ0FBQTtBQUUzQywyQkFBMkI7QUFDM0IsT0FBTyxxQkFBcUIsQ0FBQTtBQUU1Qiw4QkFBOEI7QUFDOUIsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUV2Qyx3QkFBd0I7QUFDeEIsT0FBTywyQkFBMkIsQ0FBQTtBQUVsQyxvREFBb0Q7QUFDcEQsT0FBTyxrQkFBa0IsQ0FBQTtBQUV6QixxQ0FBcUM7QUFDckMsT0FBTyx5QkFBeUIsQ0FBQTtBQUVoQyx1SUFBdUk7QUFFdkksYUFBYTtBQUNiLE9BQU8sb0NBQW9DLENBQUE7QUFFM0MsbUJBQW1CO0FBQ25CLE9BQU8sc0NBQXNDLENBQUE7QUFFN0MsZUFBZTtBQUNmLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsVUFBVTtBQUNWLE9BQU8sNkJBQTZCLENBQUE7QUFFcEMsVUFBVTtBQUNWLE9BQU8sb0NBQW9DLENBQUE7QUFFM0MsZ0JBQWdCO0FBQ2hCLE9BQU8sbUNBQW1DLENBQUE7QUFFMUMsdUJBQXVCO0FBQ3ZCLE9BQU8saUNBQWlDLENBQUE7QUFFeEMsdUJBQXVCO0FBQ3ZCLE9BQU8saUNBQWlDLENBQUE7QUFFeEMsMkJBQTJCO0FBQzNCLE9BQU8sNEJBQTRCLENBQUE7QUFFbkMsK0JBQStCO0FBQy9CLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsNEJBQTRCO0FBQzVCLE9BQU8scUNBQXFDLENBQUE7QUFFNUMsd0NBQXdDO0FBQ3hDLE9BQU8sdUNBQXVDLENBQUE7QUFFOUMseUJBQXlCO0FBQ3pCLE9BQU8sbUNBQW1DLENBQUE7QUFFMUMsd0JBQXdCO0FBQ3hCLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsOEJBQThCO0FBQzlCLE9BQU8sdUNBQXVDLENBQUE7QUFFOUMsc0NBQXNDO0FBQ3RDLE9BQU8sMEJBQTBCLENBQUEifQ==
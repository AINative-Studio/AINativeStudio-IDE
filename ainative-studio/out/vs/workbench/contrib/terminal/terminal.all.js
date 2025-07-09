/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Primary workbench contribution
import './browser/terminal.contribution.js';
// Misc extensions to the workbench contribution
import './common/environmentVariable.contribution.js';
import './common/terminalExtensionPoints.contribution.js';
import './browser/terminalView.js';
// Terminal contributions - Standalone extensions to the terminal, these cannot be imported from the
// primary workbench contribution)
import '../terminalContrib/accessibility/browser/terminal.accessibility.contribution.js';
import '../terminalContrib/autoReplies/browser/terminal.autoReplies.contribution.js';
import '../terminalContrib/developer/browser/terminal.developer.contribution.js';
import '../terminalContrib/environmentChanges/browser/terminal.environmentChanges.contribution.js';
import '../terminalContrib/find/browser/terminal.find.contribution.js';
import '../terminalContrib/chat/browser/terminal.chat.contribution.js';
import '../terminalContrib/commandGuide/browser/terminal.commandGuide.contribution.js';
import '../terminalContrib/history/browser/terminal.history.contribution.js';
import '../terminalContrib/links/browser/terminal.links.contribution.js';
import '../terminalContrib/zoom/browser/terminal.zoom.contribution.js';
import '../terminalContrib/stickyScroll/browser/terminal.stickyScroll.contribution.js';
import '../terminalContrib/quickAccess/browser/terminal.quickAccess.contribution.js';
import '../terminalContrib/quickFix/browser/terminal.quickFix.contribution.js';
import '../terminalContrib/typeAhead/browser/terminal.typeAhead.contribution.js';
import '../terminalContrib/suggest/browser/terminal.suggest.contribution.js';
import '../terminalContrib/chat/browser/terminal.initialHint.contribution.js';
import '../terminalContrib/wslRecommendation/browser/terminal.wslRecommendation.contribution.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWxsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlcm1pbmFsLmFsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxpQ0FBaUM7QUFDakMsT0FBTyxvQ0FBb0MsQ0FBQztBQUU1QyxnREFBZ0Q7QUFDaEQsT0FBTyw4Q0FBOEMsQ0FBQztBQUN0RCxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sMkJBQTJCLENBQUM7QUFFbkMsb0dBQW9HO0FBQ3BHLGtDQUFrQztBQUNsQyxPQUFPLGlGQUFpRixDQUFDO0FBQ3pGLE9BQU8sNkVBQTZFLENBQUM7QUFDckYsT0FBTyx5RUFBeUUsQ0FBQztBQUNqRixPQUFPLDJGQUEyRixDQUFDO0FBQ25HLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLCtFQUErRSxDQUFDO0FBQ3ZGLE9BQU8scUVBQXFFLENBQUM7QUFDN0UsT0FBTyxpRUFBaUUsQ0FBQztBQUN6RSxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sK0VBQStFLENBQUM7QUFDdkYsT0FBTyw2RUFBNkUsQ0FBQztBQUNyRixPQUFPLHVFQUF1RSxDQUFDO0FBQy9FLE9BQU8seUVBQXlFLENBQUM7QUFDakYsT0FBTyxxRUFBcUUsQ0FBQztBQUM3RSxPQUFPLHNFQUFzRSxDQUFDO0FBQzlFLE9BQU8seUZBQXlGLENBQUMifQ==
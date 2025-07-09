"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
(async function () {
    const bootstrapWindow = window.MonacoBootstrapWindow; // defined by bootstrap-window.ts
    const { result, configuration } = await bootstrapWindow.load('vs/code/electron-sandbox/processExplorer/processExplorerMain', {
        configureDeveloperSettings: function () {
            return {
                forceEnableDeveloperKeybindings: true
            };
        },
    });
    result.startup(configuration);
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tc2FuZGJveC9wcm9jZXNzRXhwbG9yZXIvcHJvY2Vzc0V4cGxvcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRztBQUVoRywwQ0FBMEM7QUFFMUMsQ0FBQyxLQUFLO0lBTUwsTUFBTSxlQUFlLEdBQXNCLE1BQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGlDQUFpQztJQUVsSCxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBMkQsOERBQThELEVBQUU7UUFDdEwsMEJBQTBCLEVBQUU7WUFDM0IsT0FBTztnQkFDTiwrQkFBK0IsRUFBRSxJQUFJO2FBQ3JDLENBQUM7UUFDSCxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMvQixDQUFDLEVBQUUsQ0FBQyxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Server } from '../../node/ipc.cp.js';
import { TestChannel, TestService } from './testService.js';
const server = new Server('test');
const service = new TestService();
server.registerChannel('test', new TestChannel(service));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFwcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L25vZGUvdGVzdEFwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDOUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUU1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0FBQ2xDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMifQ==
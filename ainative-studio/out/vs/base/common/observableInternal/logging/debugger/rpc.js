/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class SimpleTypedRpcConnection {
    static createHost(channelFactory, getHandler) {
        return new SimpleTypedRpcConnection(channelFactory, getHandler);
    }
    static createClient(channelFactory, getHandler) {
        return new SimpleTypedRpcConnection(channelFactory, getHandler);
    }
    constructor(_channelFactory, _getHandler) {
        this._channelFactory = _channelFactory;
        this._getHandler = _getHandler;
        this._channel = this._channelFactory({
            handleNotification: (notificationData) => {
                const m = notificationData;
                const fn = this._getHandler().notifications[m[0]];
                if (!fn) {
                    throw new Error(`Unknown notification "${m[0]}"!`);
                }
                fn(...m[1]);
            },
            handleRequest: (requestData) => {
                const m = requestData;
                try {
                    const result = this._getHandler().requests[m[0]](...m[1]);
                    return { type: 'result', value: result };
                }
                catch (e) {
                    return { type: 'error', value: e };
                }
            },
        });
        const requests = new Proxy({}, {
            get: (target, key) => {
                return async (...args) => {
                    const result = await this._channel.sendRequest([key, args]);
                    if (result.type === 'error') {
                        throw result.value;
                    }
                    else {
                        return result.value;
                    }
                };
            }
        });
        const notifications = new Proxy({}, {
            get: (target, key) => {
                return (...args) => {
                    this._channel.sendNotification([key, args]);
                };
            }
        });
        this.api = { notifications: notifications, requests: requests };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sb2dnaW5nL2RlYnVnZ2VyL3JwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWlDaEcsTUFBTSxPQUFPLHdCQUF3QjtJQUM3QixNQUFNLENBQUMsVUFBVSxDQUFnQixjQUE4QixFQUFFLFVBQTJCO1FBQ2xHLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxZQUFZLENBQWdCLGNBQThCLEVBQUUsVUFBNkI7UUFDdEcsT0FBTyxJQUFJLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBS0QsWUFDa0IsZUFBK0IsRUFDL0IsV0FBdUI7UUFEdkIsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBRXhDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUNwQyxrQkFBa0IsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0sQ0FBQyxHQUFHLGdCQUFtQyxDQUFDO2dCQUM5QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztnQkFDRCxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLENBQUM7WUFDRCxhQUFhLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDOUIsTUFBTSxDQUFDLEdBQUcsV0FBOEIsQ0FBQztnQkFDekMsSUFBSSxDQUFDO29CQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUMxQyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRTtZQUM5QixHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBVyxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sS0FBSyxFQUFFLEdBQUcsSUFBVyxFQUFFLEVBQUU7b0JBQy9CLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUEyQixDQUFDLENBQUM7b0JBQ3RGLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQzt3QkFDN0IsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUNwQixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUNyQixDQUFDO2dCQUNGLENBQUMsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUU7WUFDbkMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQVcsRUFBRSxFQUFFO2dCQUM1QixPQUFPLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtvQkFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQTJCLENBQUMsQ0FBQztnQkFDdkUsQ0FBQyxDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQVMsQ0FBQztJQUN4RSxDQUFDO0NBQ0QifQ==
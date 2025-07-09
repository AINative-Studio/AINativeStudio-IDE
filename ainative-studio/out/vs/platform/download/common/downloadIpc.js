/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export class DownloadServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event, arg) {
        throw new Error('Invalid listen');
    }
    call(context, command, args) {
        switch (command) {
            case 'download': return this.service.download(URI.revive(args[0]), URI.revive(args[1]));
        }
        throw new Error('Invalid call');
    }
}
export class DownloadServiceChannelClient {
    constructor(channel, getUriTransformer) {
        this.channel = channel;
        this.getUriTransformer = getUriTransformer;
    }
    async download(from, to) {
        const uriTransformer = this.getUriTransformer();
        if (uriTransformer) {
            from = uriTransformer.transformOutgoingURI(from);
            to = uriTransformer.transformOutgoingURI(to);
        }
        await this.channel.call('download', [from, to]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWRJcGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZG93bmxvYWQvY29tbW9uL2Rvd25sb2FkSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUtsRCxNQUFNLE9BQU8sc0JBQXNCO0lBRWxDLFlBQTZCLE9BQXlCO1FBQXpCLFlBQU8sR0FBUCxPQUFPLENBQWtCO0lBQUksQ0FBQztJQUUzRCxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWEsRUFBRSxHQUFTO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQVksRUFBRSxPQUFlLEVBQUUsSUFBVTtRQUM3QyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBSXhDLFlBQW9CLE9BQWlCLEVBQVUsaUJBQStDO1FBQTFFLFlBQU8sR0FBUCxPQUFPLENBQVU7UUFBVSxzQkFBaUIsR0FBakIsaUJBQWlCLENBQThCO0lBQUksQ0FBQztJQUVuRyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQVMsRUFBRSxFQUFPO1FBQ2hDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2hELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxHQUFHLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxFQUFFLEdBQUcsY0FBYyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDRCJ9
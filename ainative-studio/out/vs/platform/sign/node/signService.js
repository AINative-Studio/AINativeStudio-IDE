/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractSignService } from '../common/abstractSignService.js';
export class SignService extends AbstractSignService {
    getValidator() {
        return this.vsda().then(vsda => new vsda.validator());
    }
    signValue(arg) {
        return this.vsda().then(vsda => new vsda.signer().sign(arg));
    }
    async vsda() {
        const mod = 'vsda';
        const { default: vsda } = await import(mod);
        return vsda;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2lnbi9ub2RlL3NpZ25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQWlCdkYsTUFBTSxPQUFPLFdBQVksU0FBUSxtQkFBbUI7SUFDaEMsWUFBWTtRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDa0IsU0FBUyxDQUFDLEdBQVc7UUFDdkMsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUNuQixNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class AbstractSignService {
    constructor() {
        this.validators = new Map();
    }
    static { this._nextId = 1; }
    async createNewMessage(value) {
        try {
            const validator = await this.getValidator();
            if (validator) {
                const id = String(AbstractSignService._nextId++);
                this.validators.set(id, validator);
                return {
                    id: id,
                    data: validator.createNewMessage(value)
                };
            }
        }
        catch (e) {
            // ignore errors silently
        }
        return { id: '', data: value };
    }
    async validate(message, value) {
        if (!message.id) {
            return true;
        }
        const validator = this.validators.get(message.id);
        if (!validator) {
            return false;
        }
        this.validators.delete(message.id);
        try {
            return (validator.validate(value) === 'ok');
        }
        catch (e) {
            // ignore errors silently
            return false;
        }
        finally {
            validator.dispose?.();
        }
    }
    async sign(value) {
        try {
            return await this.signValue(value);
        }
        catch (e) {
            // ignore errors silently
        }
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTaWduU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zaWduL2NvbW1vbi9hYnN0cmFjdFNpZ25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBY2hHLE1BQU0sT0FBZ0IsbUJBQW1CO0lBQXpDO1FBSWtCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztJQWtEakUsQ0FBQzthQW5EZSxZQUFPLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFNcEIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQWE7UUFDMUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNuQyxPQUFPO29CQUNOLEVBQUUsRUFBRSxFQUFFO29CQUNOLElBQUksRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO2lCQUN2QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1oseUJBQXlCO1FBQzFCLENBQUM7UUFDRCxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBaUIsRUFBRSxLQUFhO1FBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDO1lBQ0osT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUI7WUFDekIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO2dCQUFTLENBQUM7WUFDVixTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBYTtRQUN2QixJQUFJLENBQUM7WUFDSixPQUFPLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLHlCQUF5QjtRQUMxQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDIn0=
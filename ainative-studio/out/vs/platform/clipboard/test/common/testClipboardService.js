/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestClipboardService {
    constructor() {
        this.text = undefined;
        this.findText = undefined;
        this.resources = undefined;
    }
    readImage() {
        throw new Error('Method not implemented.');
    }
    async writeText(text, type) {
        this.text = text;
    }
    async readText(type) {
        return this.text ?? '';
    }
    async readFindText() {
        return this.findText ?? '';
    }
    async writeFindText(text) {
        this.findText = text;
    }
    async writeResources(resources) {
        this.resources = resources;
    }
    async readResources() {
        return this.resources ?? [];
    }
    async hasResources() {
        return Array.isArray(this.resources) && this.resources.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENsaXBib2FyZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY2xpcGJvYXJkL3Rlc3QvY29tbW9uL3Rlc3RDbGlwYm9hcmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFPUyxTQUFJLEdBQXVCLFNBQVMsQ0FBQztRQVVyQyxhQUFRLEdBQXVCLFNBQVMsQ0FBQztRQVV6QyxjQUFTLEdBQXNCLFNBQVMsQ0FBQztJQWFsRCxDQUFDO0lBdkNBLFNBQVM7UUFDUixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQU1ELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQWE7UUFDMUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBYTtRQUMzQixPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFJRCxLQUFLLENBQUMsWUFBWTtRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVk7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUlELEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBZ0I7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDRCJ9
# Welcome to Void.

<div align="center">
	<img
		src="./src/vs/workbench/browser/parts/editor/media/slice_of_void.png"
	 	alt="Void Welcome"
		width="300"
	 	height="300"
	/>
</div>

Void is the open-source Cursor alternative.

Use AI agents on your codebase, checkpoint and visualize changes, and bring any model or host locally. Void sends messages directly to providers without retaining your data.

This repo contains the full sourcecode for Void. If you're new, welcome!

- 🧭 [Website](https://voideditor.com)

- 👋 [Discord](https://discord.gg/RSNjgaugJs)

- 🚙 [Project Board](https://github.com/orgs/voideditor/projects/2)


## Building and Running

### Prerequisites

**Node.js:** Make sure you have Node.js version `20.18.2` (check `.nvmrc` file). You can use [nvm](https://github.com/nvm-sh/nvm) to install the correct version:
```bash
nvm install
nvm use
```

**macOS:**
- Python and Xcode Command Line Tools (usually available by default)
- If you don't have Xcode tools: `xcode-select --install`

**Windows:**
1. Install [Visual Studio 2022 Community](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=Community) (recommended) or [VS Build Tools](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools)

2. In the Visual Studio Installer, go to **"Workloads"** tab and select:
   - `Desktop development with C++`
   - `Node.js build tools`

3. Go to **"Individual Components"** tab and select:
   - `MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)`
   - `C++ ATL for latest build tools with Spectre Mitigations`
   - `C++ MFC for latest build tools with Spectre Mitigations`

4. Click **Install**

**Linux (Ubuntu/Debian):**
```bash
# Install build dependencies
sudo apt-get install build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3

# Install runtime dependencies for Electron
sudo apt-get install libnss3 libnspr4 libasound2t64

# Install node-gyp globally
npm install -g node-gyp
```

### Building from Source

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/voideditor/void
   cd void
   npm install
   ```

2. **Build React components:**
   ```bash
   npm run buildreact
   ```

3. **Start the build process:**
   ```bash
   npm run watch
   ```
   Wait until you see both extensions and client compilation complete with 0 errors.

4. **Run the application:**
   - **macOS/Linux:** `./scripts/code.sh`
   - **Windows:** `./scripts/code.bat`

### Development Tips

- Use `Ctrl+R` (`Cmd+R`) in the application to reload and see changes
- Add `--user-data-dir ./.tmp/user-data --extensions-dir ./.tmp/extensions` flags to isolate development data
- The build process takes ~5 minutes initially
- React components need separate building when modified

For detailed build instructions and troubleshooting, see [HOW_TO_CONTRIBUTE.md](HOW_TO_CONTRIBUTE.md).

## Contributing

1. To get started working on Void, check out our Project Board! You can also see [HOW_TO_CONTRIBUTE](https://github.com/voideditor/void/blob/main/HOW_TO_CONTRIBUTE.md).

2. Feel free to attend a casual weekly meeting in our Discord channel!


## Reference

Void is a fork of the [vscode](https://github.com/microsoft/vscode) repository. For a guide to the codebase, see [VOID_CODEBASE_GUIDE](https://github.com/voideditor/void/blob/main/VOID_CODEBASE_GUIDE.md).

## Support
You can always reach us in our Discord server or contact us via email: hello@voideditor.com.

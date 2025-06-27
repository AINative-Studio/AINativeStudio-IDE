# Welcome to AINative

<div align="center">
  <h1>AINative</h1>
  <p>AI-Native Development Environment</p>
</div>

AINative is an open-source, AI-powered development environment based on Void Editor. It provides a seamless coding experience with built-in AI capabilities.

## ✨ Features

- AI-powered code completion and generation
- Built-in AI chat assistant
- Advanced code navigation and refactoring
- Cross-platform support (Windows, macOS, Linux)
- Extensible architecture with a rich extension ecosystem

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later (20.x recommended)
- npm 9.x or later
- Git
- Python 3.x (for some native dependencies)
- Build tools for your platform (see below)

### Platform-Specific Setup

#### Linux
```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y build-essential g++ libx11-dev libxkbfile-dev \
    libsecret-1-dev libkrb5-dev python3 python3-pip

# Install node-gyp globally
npm install -g node-gyp
```

#### Windows
1. Install [Visual Studio 2022](https://visualstudio.microsoft.com/downloads/) with:
   - "Desktop development with C++" workload
   - Node.js build tools

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python
```

### Installation

```bash
# Clone the repository
git clone https://github.com/ainative/ainative.git

# Navigate to the project
cd ainative/ainative-studio

# Install dependencies
npm install
```

### Running the Application

#### Development Mode
```bash
# Start the build in watch mode (in one terminal)
npm run watch

# In another terminal, start the application
./scripts/code.sh
```

#### Production Build
```bash
# Build the application
npm run build

# Run the built application
./scripts/code.sh
```

### Common Issues

#### Build Failures
- If you get Node.js version warnings, use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions:
  ```bash
  nvm install
  nvm use
  ```

#### Permission Issues on Linux
If you see sandbox errors, run:
```bash
sudo chown root:root .build/electron/chrome-sandbox
sudo chmod 4755 .build/electron/chrome-sandbox
```

### Debugging
- Use `Ctrl+R` (or `Cmd+R` on macOS) to reload the window after making changes
- Check the developer tools (`Help` > `Toggle Developer Tools`) for error messages

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](HOW_TO_CONTRIBUTE.md) for details on how to get started.

## 📚 Reference

AINative is a fork of [Void Editor](https://github.com/voideditor/void), which is itself a fork of [VS Code](https://github.com/microsoft/vscode).

## 📬 Contact

For support or questions, please open an issue in our [issue tracker](https://github.com/ainative/ainative/issues).

---

<p align="center">
  Made with ❤️ by AINative
</p>

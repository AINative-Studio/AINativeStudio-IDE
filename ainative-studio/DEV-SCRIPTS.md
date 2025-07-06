# AINative Studio Development Scripts

These scripts simplify the development workflow for AINative Studio.

## Scripts

### `./dev-start.sh` - Full Development Start
**Use this for**: First time setup or when you want to start from scratch

What it does:
- Starts `npm run watch` in the background
- Waits for initial compilation
- Builds React components if needed
- Waits for `main.js` to be created
- Launches the application
- Handles cleanup on exit (Ctrl+C)

```bash
./dev-start.sh
```

### `./dev-quick.sh` - Quick Start
**Use this for**: When you already have a build and just want to run the app

What it does:
- Checks if `main.js` exists
- Launches the application directly
- Handles cleanup on exit

```bash
./dev-quick.sh
```

### `./dev-stop.sh` - Stop All Development Processes
**Use this for**: Emergency stop or cleanup

What it does:
- Kills all watch processes
- Kills all electron processes
- Force kills if needed

```bash
./dev-stop.sh
```

## Typical Development Workflow

1. **First time or after major changes:**
   ```bash
   ./dev-start.sh
   ```

2. **Daily development (when you have existing build):**
   ```bash
   ./dev-quick.sh
   ```

3. **When you need to stop everything:**
   ```bash
   ./dev-stop.sh
   ```

## Notes

- All scripts should be run from the `ainative-studio` directory
- `dev-start.sh` will keep the watch process running until you stop it
- Press `Ctrl+C` to stop any running script
- The scripts handle cleanup automatically
- If React components change, you may need to run `npm run buildreact` manually

## Manual Commands (for reference)

If you prefer manual control:

```bash
# Start watch build
npm run watch

# Build React components
npm run buildreact

# Run application
./scripts/code.sh

# Stop processes
# Use Ctrl+C or run dev-stop.sh
```
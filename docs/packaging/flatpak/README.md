# Flatpak packaging (#109)

Scaffold for a Flathub submission, following the same pattern as
[flathub/com.vscodium.codium](https://github.com/flathub/com.vscodium.codium):
a separate manifest repo that downloads one pre-built, versioned release
tarball and repackages it — it does not compile AINative Studio from source.

## Current blocker

**No Linux release asset has ever been published.** Checked `v2.0.0` (the
latest tagged release) directly: it has macOS (`.dmg`/`.zip`) and Windows
(`.exe`/`.zip`) assets only, no Linux `.tar.gz`/`.AppImage`/`.deb`/`.rpm`.

This isn't a CI problem — `linux_x64.yml` passes reliably (last confirmed
green run: 2026-01-11). The gap is that `release-all-successful.yml` (the
workflow that assembles a GitHub Release from each platform's latest
successful CI artifacts) has apparently never been run with Linux included,
or Linux artifacts expired before it was run. `release-all-successful.yml`
already has the exact logic to pull `ainative-studio-linux-x64-tar` and
rename it to `AINativeStudio-{VERSION}-Linux-x64.tar.gz` — nothing needs to
change there.

**To unblock:** run `release-all-successful.yml` (via `workflow_dispatch`)
for the next version tag while Linux CI artifacts are fresh (artifacts
expire after a retention window), or add a Linux platform-build job as an
explicit dependency before the release step so it's guaranteed fresh.

## Once a Linux asset exists

1. Edit `com.ainativestudio.code.yml`'s `sources[0].url` to point at the
   real `AINativeStudio-vX.Y.Z-Linux-x64.tar.gz` asset URL, and set `sha256`
   from the matching `.sha256` asset (confirmed this convention already
   exists for other platforms in `release-all-successful.yml`).
2. Add a real 512x512 PNG icon at `icon.png` in this directory (derive from
   the existing app icon under `ainative-studio/resources/linux/`).
3. Test locally: `flatpak-builder --force-clean build-dir com.ainativestudio.code.yml`,
   then `flatpak-builder --run build-dir com.ainativestudio.code.yml ainative-studio`.
4. Submit as a new repo under the `flathub` GitHub org, following
   [Flathub's submission guide](https://docs.flathub.org/docs/for-app-authors/submission)
   — Flathub manifests are NOT hosted inside the app's own source repo.
5. Decide on an update cadence / whether to automate a PR to the Flathub
   repo on each new AINative Studio release (VSCodium does this with a bot;
   out of scope for the first submission).

## Why `--allow=devel` and `--filesystem=host`

Electron's own sandbox (`chrome-sandbox`) needs setuid-root behavior that
conflicts with Flatpak's bubblewrap sandbox unless specifically
accommodated. VSCodium's own manifest carries the same broad permissions
for the same reason — this is a known rough edge for Electron apps under
Flatpak generally, not something specific to this fork. Revisit if/when
Electron's sandbox gets native Flatpak portal support.

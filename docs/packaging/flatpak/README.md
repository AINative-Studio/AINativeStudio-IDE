# Flatpak packaging (#109)

Scaffold for a Flathub submission, following the same pattern as
[flathub/com.vscodium.codium](https://github.com/flathub/com.vscodium.codium):
a separate manifest repo that downloads one pre-built, versioned release
tarball and repackages it — it does not compile AINative Studio from source.

## Status: unblocked, pointed at a real release

Earlier research on this wrongly concluded no Linux release asset had ever
been published — that check only looked at `v2.0.0` (the latest tag), which
genuinely has no Linux assets (macOS/Windows only). **`v1.1.0` has a
complete set of Linux assets** (`.tar.gz`, `.AppImage`, `.deb`, `.rpm` for
x64, plus arm64 and armhf), confirmed via `gh release view v1.1.0 --json
assets`. The manifest now points at the real
`AINativeStudio-v1.1.0-Linux-x64.tar.gz` asset, with a `sha256` computed
directly (downloaded the asset and ran `shasum -a 256` on it — no
`.sha256` asset was published alongside the Linux ones for this release,
unlike some of `v2.0.0`'s macOS/Windows assets).

**One real quirk, already accounted for in the manifest:** this v1.1.0
build predates the full void→ainative rebrand reaching compiled output.
Confirmed by extracting and inspecting the real tarball: the executable
inside is still named `void` (not `ainative-studio`), and its
`product.json` still has `applicationName: "void"` and
`win32AppUserModelId: "Void.Editor"` — even though `nameShort`/`nameLong`
already say "AINative Studio" (so the running app displays correctly; only
the binary name and window class are the old values). The manifest's
`build-commands` install the real `void` binary at `/app/bin/ainative-studio`,
and the `.desktop` file's `StartupWMClass` is set to `void` to match the
actual runtime window class (getting this wrong breaks taskbar/dock icon
grouping — it must match what the running app reports, not the desktop
file's own `Exec` name).

The bundled icon is `resources/app/resources/linux/code.png` from inside
the tarball — which is itself still VS Code's stock icon, not a custom
AINative one. **Recommend pointing a future revision of this manifest at a
newer release once one exists with Linux assets** (none has shipped since
v1.1.0, released 2025-09-30) so the binary name and icon are current. The
`build-commands` and `.desktop` file have a comment flagging this to
re-check each time the `url`/`sha256` are updated.

## Status: actually built with flatpak-builder (2026-10-07)

Ran the manifest for real in a disposable Fedora 41 Docker container
(`flatpak`/`flatpak-builder` installed via `dnf`, `org.freedesktop.Platform`/
`Sdk//23.08` installed from Flathub) — this is a macOS machine, so
`flatpak-builder` ran inside Linux containers rather than natively.

**Found and fixed a real runtime-breaking bug**, not visible from reading
the manifest alone — only from actually running the build and then running
the resulting binary: `void`'s `RPATH` is `$ORIGIN` (confirmed via
`readelf -d void`), so it loads its sibling `libffmpeg.so`/`libEGL.so`/
`libGLESv2.so`/etc. from whatever directory it's executed from. The old
`build-commands` did `install -Dm755 /app/ainative-studio/void
/app/bin/ainative-studio`, which copies the binary alone into `/app/bin`,
away from those libraries. `flatpak-builder --force-clean` still built
"successfully" with that bug — the breakage only showed up when actually
running the built app:
`ainative-studio: error while loading shared libraries: libffmpeg.so: cannot
open shared object file: No such file or directory`. Fixed by symlinking
instead of copying (`ln -s /app/ainative-studio/void
/app/bin/ainative-studio`), which keeps `$ORIGIN` pointing at the directory
where the libraries actually live. Re-ran the build and the smoke-test
after the fix — the `libffmpeg.so` error is gone, and the binary now gets
as far as initializing Electron/Chromium (reaching D-Bus/X11 setup) before
failing only on things genuinely absent from a headless container (no
`DISPLAY`, no session bus) — i.e. it now fails for environmental reasons a
real desktop wouldn't hit, not for packaging reasons.

**Two things this container testing could not fully verify, flagged
honestly rather than assumed:**
- Build/smoke-tested against both the real `v1.1.0` **x64** tarball (the
  one the manifest actually ships) and, separately, the real `v1.1.0`
  **arm64** tarball on an architecture-matched container, to get a genuine
  (non-emulated) `flatpak-builder --run ... --version` execution. Running
  the actual installed x64 binary itself couldn't be smoke-tested on this
  arm64 Mac: cross-arch emulation (QEMU/Rosetta) hit an unrelated
  `bwrap`/seccomp failure (`prctl(PR_SET_SECCOMP)` `EINVAL`) specific to
  running bubblewrap under binfmt emulation, not a manifest problem. The
  arm64 smoke test exercises the identical `$ORIGIN`/symlink mechanism, so
  this is strong but not 100% identical-architecture evidence for x64.
- `org.freedesktop.Platform`/`Sdk//23.08` (what the manifest pins) is
  flagged end-of-life by Flathub's own infrastructure at install time
  ("no longer receiving fixes and security updates, please update to a
  supported runtime version") — it still installs and builds fine, but a
  real Flathub submission should bump to a current runtime version before
  going in, not just before fixing this bug.
- No real GUI/display-server smoke test was possible in a container (by
  design — this was always going to be a headless check). The binary
  reaching Electron/Chromium's X11 and D-Bus initialization before failing
  for environmental reasons is the strongest evidence obtainable in this
  environment that packaging itself is correct; it's not the same as
  confirming the window actually renders.

## Remaining steps to actually submit

1. ~~Test locally: `flatpak-builder --force-clean build-dir
   com.ainativestudio.code.yml`~~ — done, see above. Still worth a real
   (non-container) Linux x64 desktop smoke test with an actual display
   before Flathub submission, to close the two gaps noted above.
2. Bump `runtime-version` off the now-EOL `23.08` to a current
   `org.freedesktop.Platform` release before submitting.
3. Submit as a new repo under the `flathub` GitHub org, following
   [Flathub's submission guide](https://docs.flathub.org/docs/for-app-authors/submission)
   — Flathub manifests are NOT hosted inside the app's own source repo.
4. Decide on an update cadence / whether to automate a PR to the Flathub
   repo on each new AINative Studio release (VSCodium does this with a bot;
   out of scope for the first submission). Ideally paired with cutting a
   fresh release that has current Linux assets with the rebrand complete.

## Why `--allow=devel` and `--filesystem=host`

Electron's own sandbox (`chrome-sandbox`) needs setuid-root behavior that
conflicts with Flatpak's bubblewrap sandbox unless specifically
accommodated. VSCodium's own manifest carries the same broad permissions
for the same reason — this is a known rough edge for Electron apps under
Flatpak generally, not something specific to this fork. Revisit if/when
Electron's sandbox gets native Flatpak portal support.

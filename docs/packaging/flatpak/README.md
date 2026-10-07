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

## Remaining steps to actually submit

1. Test locally: `flatpak-builder --force-clean build-dir com.ainativestudio.code.yml`,
   then `flatpak-builder --run build-dir com.ainativestudio.code.yml ainative-studio`
   — not run in this pass (no `flatpak-builder` available in this environment;
   needs a real Linux machine or CI runner with it installed).
2. Submit as a new repo under the `flathub` GitHub org, following
   [Flathub's submission guide](https://docs.flathub.org/docs/for-app-authors/submission)
   — Flathub manifests are NOT hosted inside the app's own source repo.
3. Decide on an update cadence / whether to automate a PR to the Flathub
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

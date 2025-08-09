Here’s the **updated PRD** with the open questions answered and integrated so it’s fully self-contained and execution-ready.

---

# Product Requirements Document (PRD)

**Title:** Cross-Distro Containerized Packaging & Distribution for AINativeStudio-IDE

---

## 1. Purpose & Objectives

**Goal:** Provide official, automated, and user-friendly installation methods for AINativeStudio-IDE across major Linux distributions, built and tested in containers for reproducibility and seamless integration into the upstream **ainative-studio** build process.

**Objectives:**

* Automate packaging for **RPM (Fedora 42+)** and **DEB (Debian/Ubuntu LTS)** from a shared build script framework.
* Distribute RPMs via **Fedora COPR**.
* Provide **Flatpak installer** for Fedora Silverblue, Kinoite, and other immutable OS variants.
* Maintain consistent versioning, dependency management, and install experience across formats.
* Ensure all packaging and testing runs in reproducible, containerized environments that upstream CI can call directly.

---

## 2. Target Audience / Stakeholders

* **End Users:** Developers on Fedora, RHEL, CentOS Stream, Debian, Ubuntu, and Fedora immutable variants.
* **Maintainers:** Internal and external contributors building and testing packages.
* **Ops & Community Admins:** Packaging maintainers and COPR project owners.

---

## 3. Scope & Inclusions

* **Phase 1:**

  * RPM `.spec` file for Fedora 42 (RHEL 9 compatible).
  * Debian packaging with `debian/` directory for Ubuntu LTS & Debian Stable.
  * Unified containerized build scripts for both formats.
  * Containerized smoke & lint testing for both formats.
* **Phase 2:**

  * Fedora COPR project hosting.
  * Automatic RPM build triggers on GitHub release tags & nightly builds.
* **Phase 3:**

  * Flatpak manifest & build configuration.
  * Hosted in Flathub (primary) with COPR metadata mirroring for Fedora users.

---

## 4. Requirements

### 4.1 Common Build Infrastructure

* Repo contains **`containers/`** directory with container definitions for each target:

  * `fedora42-rpm.Containerfile`
  * `debian-bookworm-deb.Containerfile`
  * `ubuntu-2204-deb.Containerfile`
  * `flatpak-builder.Containerfile` (if not using stock Flatpak builder image)
* Single **entrypoint scripts** per format in `tools/package/{rpm,deb,flatpak}/build.sh`.
* All outputs stored in `dist/{rpm,deb,flatpak}`.
* Invocation via `make` targets:

  * `make package-rpm`
  * `make package-deb`
  * `make package-flatpak`
  * `make package-all`

### 4.2 RPM Packaging

* Fedora 42 spec file using modern macros.
* BuildRequires: Node.js (Fedora default), Python, gcc, make.
* Outputs `.src.rpm` & binary `.rpm`.
* Architectures: **x86\_64 and aarch64** supported from day one.
* Policy compliance verified via `rpmlint`.

### 4.3 DEB Packaging

* Debian rules file with `control` metadata.
* BuildDeps: Node.js (LTS), Python3, build-essential.
* Outputs `.deb` for Debian Stable & Ubuntu LTS.
* Architectures: **x86\_64 and aarch64** supported from day one.
* Policy compliance verified via `lintian`.

### 4.4 COPR Hosting

* COPR project configured with `copr-cli` in CI.
* Tagged releases push to `ainativestudio/ide` stable repo.
* Nightly builds from `main` branch push to `ainativestudio/ide-nightly`.
* **Nightly retention policy:** Keep last **14 days** of nightly builds; older builds auto-pruned.

### 4.5 Flatpak Packaging

* Flatpak manifest (`com.ainativestudio.IDE.json`) targeting **`org.gnome.Platform`** latest stable.
* Only **default GNOME SDK permissions** used — no extra sandbox escapes unless upstream feature requires them in future.
* Build via `flatpak-builder` in container.
* Hosted in **Flathub** under **AINativeStudio org account** (not individual maintainer), with COPR-hosted metadata mirror for Fedora integration.

---

## 5. Testing Requirements

### 5.1 Test Levels

1. **Unit/Module Tests** (from upstream ainative-studio)

   * Must pass before packaging begins.
2. **Package Install Tests**

   * RPM: `dnf install ./dist/*.rpm` in Fedora 42 container (or mock chroot).
   * DEB: `apt install ./dist/*.deb` in Debian Bookworm & Ubuntu 22.04 containers.
   * Flatpak: `flatpak install --user --noninteractive ./repo com.ainativestudio.IDE`.
3. **Runtime Smoke Tests**

   * Headless launch with `xvfb-run -a ainative-studio-ide --version` and open/close project scenario.
4. **Lint/Policy Tests**

   * RPM: `rpmlint`
   * DEB: `lintian`
   * Flatpak: manifest validation.

### 5.2 Test Scripts

* `tools/test/{rpm,deb,flatpak}/smoke.sh`
* Shared helpers in `tools/test/lib/`

---

## 6. CI/CD Integration

### 6.1 Workflow

* GitHub Actions workflow with **matrix build**:

  * `{rpm, deb, flatpak} × {x86_64, aarch64}`
* Jobs:

  * `unit-tests` (language-specific)
  * `build-packages` (containerized)
  * `package-tests` (containerized)
  * `publish` (COPR, Flathub)

### 6.2 Artifact Management

* Packages: `dist/*`
* Logs: `artifacts/logs/*`
* Reports: `artifacts/reports/*`
* SBOMs: `artifacts/sbom/*`
* SBOM format: **CycloneDX** JSON for compatibility with most security tooling.
* Signing: cosign signing of packages & containers.

---

## 7. Deliverables & Timeline

| Phase | Deliverable                    | Details                                                                                                               | Target   |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | Containerfiles + Build Scripts | `containers/*`, `tools/package/*/build.sh`, `Makefile` targets; CI matrix for RPM/DEB; containerized smoke+lint tests | +3 weeks |
| 1     | RPM & DEB Artifacts            | Fedora 42 RPM/SRPM; Debian Bookworm & Ubuntu 22.04 DEBs                                                               | +3 weeks |
| 2     | COPR Integration               | `copr-cli` automation; stable & nightly repos                                                                         | +5 weeks |
| 3     | Flatpak & Flathub              | Manifest, CI build/test in container, Flathub submission automation                                                   | +8 weeks |

---

## 8. Acceptance Criteria

* `make package-all` on clean host:

  * Builds/pulls containers.
  * Produces `.rpm`, `.src.rpm`, `.deb`, Flatpak bundle/repo in `dist/`.
  * All smoke + lint tests pass **inside containers**.
* Tagged release triggers:

  * COPR stable repo updated; installable with `dnf install`.
  * Flathub submission passes checks; Flatpak installable on Silverblue.
* Upstream ainative-studio CI can run these targets without extra host dependencies beyond Podman/Docker.

---

## 9. Non-Goals

* Packaging for Arch Linux, Snap, or proprietary stores.
* Windows/macOS native installers.
* Hosting for non-Linux platforms.

---
 
# BMS Senior Design Repository

This repository contains the software, firmware, assets, and release tooling for the UCR Battery Management System senior design project.

At a high level, the repo is organized around three working areas:

1. `BMS_Dashboard/`
   Desktop application built with Python, PyQt6, Qt WebEngine, and an embedded HTML/CSS/JavaScript frontend.
2. `Electronic_Load_Firmware/`
   STM32 firmware for the electronic load hardware used during testing.
3. `USB-Connection-Firmware/`
   STM32 firmware for the BMS-side USB/telemetry interface that the desktop dashboard talks to.

This README is the repo-level guide. It explains how the pieces fit together, what the main files are for, and where to go when you need to change a specific part of the system.

## System Overview

The project is a full-stack battery-management tooling repo:

- The desktop dashboard is the operator-facing application.
- The BMS firmware publishes telemetry such as cell voltages, thermistors, current, fan state, balancing state, and FET state.
- The electronic load firmware exposes load-channel and DAC-related control/telemetry.
- The dashboard parses serial output from the boards, converts it into frontend-friendly JSON, and renders the pack state with a 3D model and glass-style UI.
- Release tooling packages the dashboard into Windows and macOS desktop builds for GitHub Releases, while keeping local Linux packaging available, and publishes release metadata for in-app updates.

## Repository Map

```text
.
|-- README.md
|-- .gitignore
|-- BMS_Dashboard/
|-- Electronic_Load_Firmware/
|-- USB-Connection-Firmware/
`-- .metadata/
```

## Top-Level Directories

### `BMS_Dashboard/`

This is the main desktop application workspace. It includes:

- the Python launcher and backend bridge,
- the embedded web frontend,
- 3D assets and branding,
- packaging scripts and installer files,
- updater logic,
- additional firmware snapshots and supporting PDFs.

If you are changing the GUI, startup flow, serial integration, updater behavior, icons, or packaging, this is the directory you will spend most of your time in.

### `Electronic_Load_Firmware/`

This is a standalone STM32CubeIDE project for the electronic load board. It contains the firmware source, generated HAL/CubeMX files, debug output folders, and hardware documentation specific to the load board.

### `USB-Connection-Firmware/`

This is a standalone STM32CubeIDE project for the BMS USB/telemetry board. It contains the firmware that reads BMS-related hardware state and exposes it over USB CDC to the desktop app.

### `.metadata/`

This appears to be local IDE workspace metadata. It is not part of the runtime product and should generally be treated as environment-specific state rather than a source-of-truth project folder.

## Root-Level Files

### `README.md`

This file. Repo-level orientation and file map.

### `.gitignore`

Currently ignores `BMS_Dashboard/dist/`. It is very minimal and does not cover every generated file in the repo.

## `BMS_Dashboard/` Detailed Guide

`BMS_Dashboard/` is the largest part of the repo and mixes runtime source, generated firmware trees, packaging assets, and documentation. The sections below separate the important source files from generated or reference content.

### Main Runtime Entry Points

#### `BMS_Dashboard/gui_launcher.py`

Primary desktop app entrypoint.

This file is responsible for:

- launching the PyQt application,
- creating the main `DashboardWindow`,
- creating the WebEngine view,
- starting the internal static file server used by the frontend,
- exposing Python functionality to the frontend through `QWebChannel`,
- creating and managing serial worker threads,
- coordinating startup/loading state,
- forwarding telemetry to the embedded frontend,
- handling update checks, staged installs, and restart flows,
- serving runtime assets such as `BMS.glb` and the startup logo.

If you need to change startup behavior, window orchestration, QWebEngine behavior, bridge wiring, update flow, or serial-thread lifecycle, this is the main file.

#### `BMS_Dashboard/backend/version.py`

Stores the application version constant:

- `APP_VERSION = "2.0.6"`

The release workflow checks that a pushed tag matches this value.

### Python Backend Modules

#### `BMS_Dashboard/backend/data_stream.py`

Serial parsing and worker-thread logic.

This file handles:

- serial port enumeration,
- auto/manual port targeting,
- reading and decoding raw USB serial frames,
- recognizing structured BMS telemetry lines,
- assembling partial multiline telemetry frames,
- parsing voltages, temperatures, current, fan state, balancing state, and FET state,
- emitting normalized dashboard payloads to the GUI layer.

It is the source-of-truth parser for what the frontend receives from hardware.

#### `BMS_Dashboard/backend/settings_store.py`

Persistent configuration storage.

This file manages:

- serial port and baudrate settings,
- E-Load port settings,
- update channel state,
- staged-update metadata,
- OS-specific config file locations.

It writes a JSON config file under the platform-appropriate user config directory.

#### `BMS_Dashboard/backend/updater.py`

GitHub Releases updater client.

This file handles:

- release discovery from GitHub,
- manifest download and validation,
- semantic version comparison,
- platform asset selection,
- checksum verification,
- staged update bookkeeping helpers.

#### `BMS_Dashboard/backend/update_helper.py`

Background helper used during packaged installs/updates.

This file handles:

- waiting for the running app to exit,
- swapping binaries or app bundles,
- mounting/unmounting DMGs on macOS,
- replacing EXEs on Windows,
- relaunching the app after install,
- writing structured result files for the main app to consume.

#### `BMS_Dashboard/backend/mock_data.py`

Currently empty placeholder file.

#### `BMS_Dashboard/backend/requirements.txt`

Backend-local dependency file. The main dashboard install flow uses the top-level `BMS_Dashboard/requirements.txt`.

### Frontend Application

The frontend is a web UI served into Qt WebEngine. The dashboard uses a local HTTP server rather than loading files directly, which keeps runtime asset URLs predictable.

#### `BMS_Dashboard/frontend/index.html`

Main dashboard page.

This file defines the visible app shell, including:

- the BMS page,
- the E-Load page,
- glass panels,
- cell grid,
- detail panel,
- telemetry widgets,
- serial config UI,
- the in-page boot overlay used when the app is not using the separate splash window.

#### `BMS_Dashboard/frontend/style.css`

Primary dashboard stylesheet.

It contains:

- the global theme,
- layout and panel styling,
- responsive behavior,
- page tabs,
- detail panel behavior,
- boot/reveal styling for the in-page startup flow,
- dashboard glass visual language.

#### `BMS_Dashboard/frontend/scene.js`

Primary frontend runtime script and the largest frontend logic file.

It handles:

- Three.js scene setup,
- model loading for the BMS and E-Load views,
- startup boot state calculation,
- cinematic reveal/handoff behavior,
- hardware-state rendering,
- cell selection and detail panel updates,
- serial terminal and UI-side command flow,
- frontend hooks that Python calls such as `window.updateDashboard(...)`,
- connection-state visual behavior,
- startup debug hooks used by Python polling.

If you are changing the dashboard behavior, 3D interactions, telemetry mapping, or main startup logic, this is one of the first files to inspect.

#### `BMS_Dashboard/frontend/startup.html`
#### `BMS_Dashboard/frontend/startup.css`
#### `BMS_Dashboard/frontend/startup.js`

Dedicated startup splash page.

These files implement the separate startup experience shown before the main dashboard becomes visible. The splash is designed to be card-only, transparent around the edges, and coordinated by Python based on real dashboard readiness.

#### `BMS_Dashboard/frontend/boot-liquid.js`

Reusable liquid-glass/refraction renderer used by the startup UI.

This file encapsulates the shader-backed card effect rather than leaving that logic inside `scene.js` or `startup.js`.

#### `BMS_Dashboard/frontend/qwebchannel.js`

Qt WebChannel bridge script used by the embedded web app.

#### `BMS_Dashboard/frontend/anime-toolbox.html`
#### `BMS_Dashboard/frontend/anime-toolbox.css`
#### `BMS_Dashboard/frontend/anime-toolbox.js`

Experimental/demo frontend assets unrelated to the main dashboard runtime. These look like reference or prototype files rather than part of the shipping UI.

### Frontend Assets

#### `BMS_Dashboard/frontend/BMS.glb`

Main BMS 3D model used by the dashboard frontend.

#### `BMS_Dashboard/frontend/E-Load.glb`

E-Load 3D model used by the E-Load page in the dashboard.

#### `BMS_Dashboard/frontend/battery_design.fbx`

Additional 3D asset source/reference file.

#### `BMS_Dashboard/frontend/assets/branding/bms-logo.png`

Frontend-local branding asset.

#### `BMS_Dashboard/frontend/vendor/three/`

Vendored Three.js runtime and addons:

- controls,
- loaders,
- curves,
- utility helpers,
- the module build itself.

Treat this as third-party code unless you intentionally need to patch the vendored library.

### Build, Packaging, and Release Files

#### `BMS_Dashboard/requirements.txt`

Runtime dependencies for the desktop app:

- `PyQt6`
- `PyQt6-WebEngine`
- `pyserial`
- `requests`
- `packaging`

#### `BMS_Dashboard/requirements-dev.txt`

Additional development/build dependencies:

- runtime requirements,
- `Pillow`
- `pyinstaller`

#### `BMS_Dashboard/BMSDashboard.spec`

PyInstaller spec file for the dashboard bundle. It includes:

- the frontend folder,
- icon assets,
- `BMS.glb`,
- `BMS Logo (new).png`.

#### `BMS_Dashboard/scripts/build_windows.ps1`

Builds the Windows release package.

This script:

- regenerates icons,
- runs PyInstaller,
- trims Qt WebEngine locales,
- signs the EXE if certificate secrets are available,
- builds the NSIS installer,
- writes release artifacts to `dist/release/windows-x64/`.

#### `BMS_Dashboard/scripts/build_macos.sh`

Builds the macOS app bundle, DMG, and ZIP package.

This script:

- regenerates icons,
- runs PyInstaller,
- trims Qt WebEngine locales,
- re-signs the app bundle after post-build modifications,
- optionally notarizes/staples the result,
- writes release artifacts to `dist/release/macos-universal2/`.

#### `BMS_Dashboard/scripts/build_linux.sh`

Builds the Linux AppImage release.

This script:

- regenerates icons,
- runs PyInstaller,
- trims Qt WebEngine locales,
- builds an AppDir,
- downloads or uses `appimagetool`,
- produces an AppImage in `dist/release/linux-x64/`.

#### `BMS_Dashboard/scripts/generate_icons.py`

Generates `app_icon.png`, `app_icon.ico`, and `app_icon.icns` from the branding PNG.

The current default input is:

- `BMS Logo (new).png`

#### `BMS_Dashboard/scripts/build_release_manifest.py`

Generates `release-manifest.json`, which the updater uses to find platform assets and verify checksums.

#### `BMS_Dashboard/scripts/optimize_pyinstaller_bundle.py`

Reduces bundle size by pruning unneeded Qt WebEngine locale files.

#### `BMS_Dashboard/packaging/windows/installer.nsi`

NSIS installer definition for Windows builds.

It defines:

- install/uninstall behavior,
- update-mode process handling,
- executable replacement behavior,
- shortcuts and uninstall registry entries.

#### `.github/workflows/bms-dashboard-release.yml`

GitHub Actions workflow for tagged desktop releases.

It:

- validates the version tag,
- builds Windows and macOS packages from `BMS_Dashboard/`,
- uploads intermediate artifacts,
- generates release notes and the release manifest,
- publishes the GitHub Release.

### Documentation and Reference PDFs

#### `BMS_Dashboard/docs/release.md`

Release runbook for packaging, signing, release publishing, and rollback expectations.

#### `BMS_Dashboard/docs/download-app.md`

End-user install instructions for packaged dashboard builds.

#### `BMS_Dashboard/project_details.pdf`
#### `BMS_Dashboard/Senior Design Block Diagrams.pdf`
#### `BMS_Dashboard/Schematic PDF_[No Variations] (1).pdf`
#### `BMS_Dashboard/firmware.pdf`
#### `BMS_Dashboard/firmware_update.pdf`
#### `BMS_Dashboard/stm32f303rc.pdf`

Project reference material, block diagrams, hardware documentation, firmware-related reference PDFs, and MCU documentation.

### Branding and Root-Level Dashboard Assets

#### `BMS_Dashboard/BMS Logo (new).png`

Current canonical branding image used for startup/logo/icon generation.

#### `BMS_Dashboard/BMS Logo.png`

Legacy branding image retained as a fallback/reference.

#### `BMS_Dashboard/BMS.glb`

Root-level copy of the BMS model used by the launcher/runtime asset server and packaging scripts.

### Utility and Miscellaneous Files

#### `BMS_Dashboard/serial_dump_com5.py`

Simple serial console utility for live inspection of a COM port from Python.

#### `BMS_Dashboard/patch_makefiles.py`

One-off helper script that patches generated firmware makefiles to add CMSIS include paths. This is a maintenance utility rather than a normal runtime/build entrypoint.

#### `BMS_Dashboard/filelist.txt`

Inventory/reference file. Not part of the main runtime path.

### Dashboard-Local Firmware Mirrors

The dashboard folder also contains firmware trees:

- `BMS_Dashboard/BMS_Firmware/`
- `BMS_Dashboard/USB-Connection-Firmware/`

These look like local firmware workspaces or mirrored copies retained alongside the desktop app. The root-level `Electronic_Load_Firmware/` and `USB-Connection-Firmware/` folders should generally be treated as the primary standalone firmware projects, while the dashboard-local firmware folders are useful as co-located references and integration assets.

### Generated or Machine-Specific Dashboard Content

These folders are generally not where you start when making source changes:

- `BMS_Dashboard/build/`
- `BMS_Dashboard/dist/`
- `BMS_Dashboard/__pycache__/`
- `BMS_Dashboard/firmware_staging/`
- portions of `BMS_Dashboard/tools/`

Some of these are generated build outputs; others are tool caches or vendor/toolchain downloads.

## `Electronic_Load_Firmware/` Detailed Guide

This is an STM32CubeIDE project for the electronic load board.

### Important directories

- `Core/`
  Application source and headers. `Core/Src/main.c` is the main firmware entrypoint.
- `Drivers/`
  STM32 HAL/CMSIS code generated or managed by CubeMX/CubeIDE.
- `Middlewares/`
  Middleware libraries such as USB device support.
- `USB_DEVICE/`
  USB CDC/device glue for the board.
- `Debug/`
  Generated build output.
- `tmp/`
  Temporary/generated workspace content.

### Important files

- `Electronic_Load_Firmware.ioc`
  STM32CubeMX project configuration.
- `Electronic_Load_Firmware.launch`
  STM32CubeIDE launch configuration.
- `STM32F303RCTX_FLASH.ld`
  Linker script.
- `E-Load Schematics.pdf`
  Hardware schematic for the electronic load board.

### Firmware behavior

Based on `Core/Src/main.c`, this firmware includes logic for:

- USB CDC communication,
- DAC control through MCP4725,
- ADC/DMA sampling,
- shunt/voltage sense reporting,
- per-channel load enable/disable behavior,
- periodic telemetry reporting.

## `USB-Connection-Firmware/` Detailed Guide

This is an STM32CubeIDE project for the BMS USB/telemetry interface.

### Important directories

- `Core/`
  Main firmware application source.
- `Src/`
  Additional project source files.
- `Startup/`
  startup assembly/bootstrap files.
- `Drivers/`
  STM32 HAL/CMSIS code.
- `Middlewares/`
  middleware support.
- `USB_DEVICE/`
  USB CDC/device glue.
- `STM32CubeIDE/`
  IDE-generated launch/build content.
- `Debug/`
  debug build outputs.
- `Release/`
  release build outputs.

### Important files

- `USB-Connection-Firmware.ioc`
  STM32CubeMX hardware/project configuration.
- `USB-Connection-Firmware.txt`
  exported CubeMX project summary showing pins, peripherals, and config metadata.
- `USB-Connection-Firmware.pdf`
  project documentation/reference export.
- `Senior-Design-BMS-Schematics (1).pdf`
  BMS hardware schematic.
- `STM32F303RCTX_FLASH.ld`
  linker script.

### Firmware behavior

Based on `Core/Src/main.c`, this firmware includes logic for:

- BQ76930/BMS register access,
- 10-channel thermistor reading and temperature conversion,
- current sensing,
- fan tach/PWM logic,
- cell balancing logic,
- FET charge/discharge/off control,
- USB CDC command handling.

This is the firmware the dashboard most directly depends on for BMS telemetry.

## Quick Start

### Run the desktop dashboard from source

```bash
cd BMS_Dashboard
python -m pip install -r requirements.txt
python gui_launcher.py
```

Useful runtime flags:

```bash
python gui_launcher.py --serial-port auto --baudrate 115200
python gui_launcher.py --serial-port COM5 --baudrate 115200
python gui_launcher.py --no-auto-update-check
```

### Work on the firmware

1. Open STM32CubeIDE.
2. Import either:
   - `Electronic_Load_Firmware/`, or
   - `USB-Connection-Firmware/`
3. Build and flash from STM32CubeIDE.

## Build and Release Flow

### Local desktop packaging

From `BMS_Dashboard/`:

- Windows:
  `./scripts/build_windows.ps1 -Version <version>`
- macOS:
  `./scripts/build_macos.sh <version>`
- Linux:
  `./scripts/build_linux.sh <version>`

### Automated release publishing

Tagged releases are handled by:

- `.github/workflows/bms-dashboard-release.yml`

Expected versioning flow:

1. Update `BMS_Dashboard/backend/version.py`
2. Push a matching dashboard release tag such as `bms-dashboard-v2.0.6`
3. GitHub Actions builds and publishes the release assets

For the full release checklist, see:

- `BMS_Dashboard/docs/release.md`

## Hardware and Design References

Useful reference documents already in the repo:

- `BMS_Dashboard/Senior Design Block Diagrams.pdf`
- `BMS_Dashboard/project_details.pdf`
- `BMS_Dashboard/Schematic PDF_[No Variations] (1).pdf`
- `Electronic_Load_Firmware/E-Load Schematics.pdf`
- `USB-Connection-Firmware/Senior-Design-BMS-Schematics (1).pdf`
- `USB-Connection-Firmware/USB-Connection-Firmware.pdf`

## What To Edit For Common Tasks

### Change the main dashboard UI

Start in:

- `BMS_Dashboard/frontend/index.html`
- `BMS_Dashboard/frontend/style.css`
- `BMS_Dashboard/frontend/scene.js`

### Change the startup/loading experience

Start in:

- `BMS_Dashboard/gui_launcher.py`
- `BMS_Dashboard/frontend/startup.html`
- `BMS_Dashboard/frontend/startup.css`
- `BMS_Dashboard/frontend/startup.js`
- `BMS_Dashboard/frontend/boot-liquid.js`

### Change serial parsing or hardware payload mapping

Start in:

- `BMS_Dashboard/backend/data_stream.py`
- `BMS_Dashboard/gui_launcher.py`

### Change persistent settings behavior

Start in:

- `BMS_Dashboard/backend/settings_store.py`

### Change updater/release behavior

Start in:

- `BMS_Dashboard/backend/updater.py`
- `BMS_Dashboard/backend/update_helper.py`
- `BMS_Dashboard/scripts/build_release_manifest.py`
- `BMS_Dashboard/scripts/build_windows.ps1`
- `BMS_Dashboard/scripts/build_macos.sh`
- `BMS_Dashboard/scripts/build_linux.sh`
- `BMS_Dashboard/packaging/windows/installer.nsi`

### Change app branding or icons

Start in:

- `BMS_Dashboard/BMS Logo (new).png`
- `BMS_Dashboard/scripts/generate_icons.py`
- `BMS_Dashboard/assets/icons/`

### Change the BMS firmware telemetry/control behavior

Start in:

- `USB-Connection-Firmware/Core/Src/main.c`

### Change the electronic load firmware behavior

Start in:

- `Electronic_Load_Firmware/Core/Src/main.c`

## Notes On Source vs Generated Content

This repo contains a mix of:

- handwritten source,
- generated STM32CubeIDE/CubeMX output,
- generated build folders,
- vendored third-party frontend libraries,
- PDF documentation,
- cached/tooling artifacts.

When making normal project changes, focus first on:

- root docs,
- `BMS_Dashboard/gui_launcher.py`,
- `BMS_Dashboard/backend/`,
- `BMS_Dashboard/frontend/`,
- `BMS_Dashboard/scripts/`,
- root-level firmware `Core/` sources.

Be more cautious in:

- `Debug/`, `Release/`, `build/`, `dist/`, `__pycache__/`,
- vendored frontend libraries,
- auto-generated STM32 HAL/Cube files unless the change is intentionally firmware/platform-level.

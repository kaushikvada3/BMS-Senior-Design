# Release Runbook

## Prerequisites

- Python 3.11
- `pip install -r requirements-dev.txt`
- Platform packaging tools:
  - Windows: NSIS (`makensis`)
  - macOS: Xcode command line tools (`codesign`, `xcrun`, `hdiutil`)

## Local Build Commands

### Windows

```powershell
./scripts/build_windows.ps1 -Version 2.0.6
```

### macOS

```bash
chmod +x scripts/build_macos.sh
./scripts/build_macos.sh 2.0.6
```

### Optional Local Linux Build

```bash
chmod +x scripts/build_linux.sh
./scripts/build_linux.sh 2.0.6
```

Linux packaging remains available locally, but it is not part of the GitHub release pipeline.

## CI Secrets

Optional Windows signing:
- `WIN_CERT_BASE64`
- `WIN_CERT_PASSWORD`

Optional Apple signing/notarization:
- `APPLE_CERT_P12_BASE64`
- `APPLE_CERT_PASSWORD`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_PASSWORD`

Optional:
- `GH_TOKEN` (workflow also works with default `GITHUB_TOKEN` and `contents: write` permission)

## GitHub Release Flow

1. Push all release-ready changes to main branch.
2. Update `backend/version.py` so `APP_VERSION` matches the release version.
3. Create and push a dashboard release tag:
   - `git tag bms-dashboard-v2.0.6`
   - `git push origin bms-dashboard-v2.0.6`
4. Workflow `.github/workflows/bms-dashboard-release.yml` builds:
   - Windows NSIS installer
   - macOS DMG for manual install
   - macOS ZIP payload for in-app updates
5. The workflow builds `release-manifest.json` and publishes all files to GitHub Releases.

You can also rerun or manually publish the workflow through `workflow_dispatch` by providing a tag in the same `bms-dashboard-vX.Y.Z` format.

## Manifest Contract

`release-manifest.json` includes:
- `version`
- `channel` (`stable`)
- `published_at`
- `notes`
- `assets`:
  - `windows-x64`
  - `macos-universal2`

Each platform asset contains:
- `url`
- `sha256`
- `signature`

Manifest asset targets:
- `windows-x64.url` points to `BMSDashboard-windows-x64-setup.exe`
- `macos-universal2.url` points to `BMSDashboard-macos-universal2.zip`

The DMG is still published to GitHub Releases for manual installation, but the updater consumes the ZIP so it can replace the installed `.app` bundle in place.

## Rollback Strategy

Do not delete released tags.

To roll back:
1. Rebuild the last known-good binary set.
2. Bump patch version (example: from `bms-dashboard-v2.0.6` to `bms-dashboard-v2.0.7`).
3. Publish that known-good build as the new stable release.

Clients on stable will move to the highest stable version automatically.

# Release Notes

Welcome to the **BMS-Senior-Design** Release Documentation! This file tracks the official releases, features, and fixes for the Battery Management System (BMS) Firmware and Dashboard projects.

## [v1.0.0] - Initial Official Release (March 2026)

### Added
*   **BMS Dashboard (Python & Three.js)**: 
    *   Sleek GUI backend processing serial data using `PyQt6`.
    *   3D Visualizer created with `Three.js` showing 10-cell representation with live color/data updates (`scene.js`).
    *   Real-time serial telemetry extraction and graphing of voltages, temperatures, and current.
*   **USB Connection Firmware (STM32 & C)**: 
    *   Data acquisition from 10 ADC thermistor channels.
    *   Reading battery data and cell balancing utilizing BQ76930 integrated circuits over I2C.
    *   Active fan control utilizing TIM timer modules.
    *   USB CDC transmission of structured JSON-like payload frames to the Python dashboard.
*   **E-Load Firmware**:
    *   Basic Electronic Load functionality and serial reporting.
*   **Documentation & Licensing**:
    *   Added official `LICENSE` (MIT) to the repository.
    *   Added `RELEASES.md` documentation for project history tracking.

### Changed
*   Restructured GUI logic and optimized layout for the `gui_launcher.py`.
*   Standardized the multi-line parsing mechanism inside `data_stream.py` to robustly catch telemetry frames.

### Fixed
*   Resolved thermal shut-off parsing logic and FET control edge cases.
*   Fixed structural inconsistencies in serial streaming for robust data handling.

---
*Authored by Kaushik Vada & Team*

# Battery Management System (BMS) - Senior Design

This repository contains the software and firmware components for the Battery Management System (BMS) Senior Design project.

## Repository Structure

The project is divided into three main components, each housed in its own directory:

### 1. [BMS_Dashboard](./BMS_Dashboard)
A desktop application built with Python (PyQt6) and an embedded web frontend. It serves as the primary user interface to monitor and interact with the Battery Management System.
- **Features:** Real-time data visualization, USB/Serial communication with the BMS hardware, and a modern graphical dashboard.
- **Tech Stack:** Python, PyQt6, HTML/CSS/JS.

### 2. [Electronic_Load_Firmware](./Electronic_Load_Firmware)
Firmware designed for the Electronic Load hardware component of the system.
- **Development Environment:** STM32CubeIDE
- **Microcontroller:** STM32F303RCTx series
- **Features:** Controls the electronic load characteristics for testing and managing battery discharge.

### 3. [USB-Connection-Firmware](./USB-Connection-Firmware)
Firmware responsible for handling the USB communication interface between the BMS MCU and the dashboard application.
- **Development Environment:** STM32CubeIDE
- **Microcontroller:** STM32F303RCTx series
- **Features:** Enables reliable serial data transfer to the desktop dashboard.

## Hardware Documentation & Schematics
Relevant hardware documentation, block diagrams, and schematics can be found inside the respective subdirectories:
- `BMS_Dashboard/Senior Design Block Diagrams.pdf`
- `Electronic_Load_Firmware/E-Load Schematics.pdf`
- `USB-Connection-Firmware/Senior-Design-BMS-Schematics (1).pdf`

## Getting Started

### Dashboard Setup
To run the BMS Dashboard locally:

```bash
cd BMS_Dashboard
pip install -r requirements.txt
python gui_launcher.py
```
*(For detailed GUI build/release instructions and additional runtime flags, refer to `BMS_Dashboard/README.md`)*

### Firmware Development
To work on either of the firmware components:
1. Install [STM32CubeIDE](https://www.st.com/en/development-tools/stm32cubeide.html).
2. Import the `Electronic_Load_Firmware` or `USB-Connection-Firmware` folder as an existing project into your STM32CubeIDE workspace.
3. Compile the code and flash it to your target STM32 microcontroller.

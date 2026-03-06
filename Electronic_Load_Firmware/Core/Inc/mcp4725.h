/**
 * @file    mcp4725.h
 * @brief   MCP4725A0T-E/CH 12-bit DAC driver over I2C
 */
#ifndef MCP4725_H
#define MCP4725_H

#include "stm32f3xx_hal.h"

/* MCP4725A0: 7-bit address 0x60 (A0 = GND), left-shifted for HAL */
#define MCP4725_ADDR 0xC0U

/**
 * @brief  Set the MCP4725 output using Fast Mode Write (2 bytes).
 * @param  dac_value  12-bit value (0–4095). Values >4095 are clamped.
 * @retval HAL_OK if the DAC ACK'd, HAL_ERROR / HAL_TIMEOUT otherwise.
 */
HAL_StatusTypeDef MCP4725_SetVoltage(uint16_t dac_value);

#endif /* MCP4725_H */

# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

### ComfoAir Adapter Specific Context
This adapter is specifically designed to control Zehnder ComfoAir ventilation systems (CA series, NOT ComfoAir Q series). It provides comprehensive control and monitoring of ComfoAir ventilation units through serial RS232 or IP/LAN connections.

**Key Features:**
- Temperature monitoring (5 different sensors: ABL/AUL/EWT/FOL/ZUL)
- Ventilation level control (4 levels: absent, low, medium, high)  
- Boost mode operation with configurable duration
- Filter status and timer management
- Multiple RS232 operation modes (CC Ease only, PC Master, PC Log mode)
- Support for both serial and IP/LAN connections
- Enthalpy exchanger monitoring (temperature, humidity, coefficient)

**Connection Methods:**
- **Serial Connection**: Direct RS232 connection using pins 2, 3, and 5
- **IP/LAN Connection**: RS232 to LAN/WiFi converter for remote access
- **Operation Modes**: Adapter only, Listening only, Parallel mode, Constant PC-logmode

**Communication Protocol:**
- RS232 serial communication at specific intervals
- Command/response protocol with ComfoAir unit
- State management for connection modes and CC Ease compatibility
- Boost mode timing and automatic return to previous ventilation level

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Test files should follow the pattern `*.test.js`
- Place tests in the `test/` directory
- Use the `@iobroker/testing` package for adapter-specific test utilities

### Test Structure
```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

// Run tests
tests.integration(path.join(__dirname, '..'));
```

### ComfoAir Specific Testing
- Mock serial port connections for unit tests
- Test RS232 command parsing and response handling
- Validate temperature value conversions and ranges
- Test ventilation level state transitions
- Mock boost mode timing and automatic shutoff
- Test connection mode switching (CC Ease vs PC modes)

## Development Guidelines

### General ioBroker Patterns
- Always extend from `@iobroker/adapter-core`
- Use proper state management with `this.setState()` and `this.getState()`
- Implement connection status with `info.connection` state
- Use appropriate logging levels: `this.log.error()`, `this.log.warn()`, `this.log.info()`, `this.log.debug()`
- Handle adapter unload properly in `unload()` method
- Use `native` configuration from `io-package.json`

### ComfoAir Specific Patterns
- Always validate RS232 mode before sending commands
- Implement proper serial port cleanup on adapter shutdown
- Handle connection timeouts and retry logic for network connections
- Parse binary ComfoAir protocol data correctly (temperature values, status bits)
- Implement boost mode with automatic timer management
- Manage state transitions between different ventilation levels
- Handle CC Ease compatibility modes appropriately

### State Management
```javascript
// Temperature states (read-only)
await this.setStateAsync('temperature.ABL', { val: temp_abl, ack: true });

// Control states (writable)  
await this.setStateAsync('control.boost', { val: false, ack: true });

// Status information
await this.setStateAsync('status.statstufe', { 
    val: level, 
    ack: true,
    states: { 0: 'Abwesend', 1: 'tief', 2: 'mittel', 3: 'hoch' }
});
```

### Error Handling
- Always wrap serial communication in try-catch blocks
- Implement connection recovery for network failures
- Log specific error types (serial, network, protocol) appropriately
- Use Sentry integration for error reporting and debugging
- Handle CC Ease mode conflicts gracefully

### Configuration Management
```javascript
// Native config access
const hostConfig = this.config.host;
const serialDevice = this.config.serialdevice;
const pollInterval = this.config.pollInterval || 1800000;

// Connection type selection
if (this.config.connectionip) {
    // IP/LAN connection setup
} else if (this.config.connectionserial) {
    // Serial connection setup
}
```

## Code Style

### Formatting
- Use Prettier for code formatting (configured in `.prettierrc.js`)
- Follow ESLint rules defined in `.eslintrc.json`
- Use 4-space indentation for consistency
- Use semicolons and consistent quote style

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_CASE for constants
- State IDs should follow ioBroker naming conventions (`channel.state`)

### ComfoAir Protocol Conventions
- Temperature variables: `temp_[sensor]` (ABL, AUL, EWT, FOL, ZUL)
- Ventilation levels: `vent_[type]` (ZUL, ABL for supply/exhaust air)
- Status states: `stat_[parameter]` for current operational status
- Control commands: `cmd_[action]` for outgoing commands

## Dependencies

### Core Dependencies
- `@iobroker/adapter-core`: Main adapter framework
- `serialport`: Serial communication with ComfoAir units
- `@serialport/parser-inter-byte-timeout`: Handle RS232 timing requirements
- `delimiter-stream`: Parse protocol frames
- `string_decoder`: Handle text data conversion

### Development Dependencies  
- `@iobroker/testing`: Adapter testing utilities
- `mocha`: Test runner for integration tests
- `eslint`: Code quality and style checking
- `prettier`: Code formatting
- `@alcalzone/release-script`: Automated release management

## File Structure

### Core Files
- `main.js`: Main adapter entry point
- `io-package.json`: Adapter metadata and object definitions
- `admin/`: Admin interface files (HTML, CSS, translations)

### ComfoAir Specific Structure
- Temperature states: `temperature.[ABL|AUL|EWT|FOL|ZUL]`
- Status channel: `status.[rs232mode|statstufe|vent*|enthalpie.*]`
- Control channel: `control.[boost|boosttime]`
- Info channel: `info.connection` (connection status)

### Object Definitions
All state objects are predefined in `io-package.json` with proper types, roles, units, and value mappings for ComfoAir protocol data.

## Performance Considerations

### Serial Communication
- Use appropriate poll intervals to avoid overwhelming the ComfoAir unit
- Implement command queuing for multiple operations
- Handle RS232 mode switching efficiently
- Cache frequently accessed states to reduce serial traffic

### Memory Management
- Properly close serial ports and network connections
- Clear timers and intervals in `unload()` method
- Avoid memory leaks in boost mode timer management
- Use appropriate timeout values for network connections

## Security Best Practices

### Network Security
- Validate IP addresses and ports in configuration
- Use secure communication where possible
- Implement proper timeout handling for network requests
- Log security-relevant events appropriately

### Data Validation
- Validate all ComfoAir protocol responses
- Check temperature value ranges for plausibility  
- Sanitize user inputs for boost time and ventilation levels
- Validate RS232 mode transitions

## Troubleshooting Common Issues

### Connection Problems
- Check RS232 cable wiring (pins 2, 3, 5)
- Verify ComfoAir RS232 mode setting
- Test serial port permissions on Linux systems
- Validate network connectivity for IP connections

### CC Ease Conflicts
- Ensure CC Ease is disconnected in "Adapter only" mode
- Use "Listening only" mode to avoid command conflicts
- Monitor RS232 mode changes in parallel modes
- Check for communication errors in logs

### Protocol Issues  
- Verify ComfoAir unit model compatibility (CA series only)
- Check baud rate and serial port settings
- Monitor for timeout errors and adjust poll intervals
- Validate temperature sensor readings for plausibility

This guide helps GitHub Copilot provide contextually appropriate suggestions for ComfoAir adapter development, including proper protocol handling, state management, and ioBroker integration patterns.
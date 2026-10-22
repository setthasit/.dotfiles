# Embedded and Firmware Checklist

Each item is a check a device owner or field engineer would fail you on. The chip vendor's reference manual and errata win over this file on any setting. Memory safety follows the `application-security` skill.

## Budgets

- Flash, RAM, and stack use have stated limits, checked in the build from the map file. Each task's stack has a measured high-water mark with margin
- Boot to working has a stated target, measured on the real board
- Current draw in each power state (active, idle, sleep) has a target. Battery life is stated for a named duty cycle
- Each timing-bound path has a measured interrupt latency and longest critical section

## Fails safe

- A watchdog runs, fed only from a point that proves the main loop is healthy, never from a timer interrupt
- Every reset cause (fault, assert, brownout, watchdog) is recorded and survives the reboot for later readout
- Power loss during a flash write never corrupts settings: writes go through A/B pages or a journal
- Outputs hold a safe state from power-on until the firmware configures them
- No dynamic allocation after init, or a bounded pool with a stated reason

## Updates

- A field update uses A/B slots and a signed image. An image that fails its self-check rolls back on its own
- The bootloader refuses a downgrade to a version with a known flaw
- The version and build ID can be read from the device

## Operator feedback

- An LED, display, or log line shows each state the operator needs: booting, connected, error, updating
- The debug log has levels and is reduced in production builds

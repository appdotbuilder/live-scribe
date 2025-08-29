import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { getAudioDevices } from '../handlers/get_audio_devices';
import { type AudioDevice } from '../schema';

describe('getAudioDevices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return an array of audio devices', async () => {
    const devices = await getAudioDevices();

    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should return devices with all required properties', async () => {
    const devices = await getAudioDevices();

    devices.forEach((device: AudioDevice) => {
      expect(device.device_id).toBeDefined();
      expect(typeof device.device_id).toBe('string');
      expect(device.device_id.length).toBeGreaterThan(0);

      expect(device.label).toBeDefined();
      expect(typeof device.label).toBe('string');
      expect(device.label.length).toBeGreaterThan(0);

      expect(device.kind).toBeDefined();
      expect(['audioinput', 'audiooutput'].includes(device.kind)).toBe(true);

      // group_id can be null or a string
      expect(device.group_id === null || typeof device.group_id === 'string').toBe(true);
    });
  });

  it('should return expected mock devices', async () => {
    const devices = await getAudioDevices();

    // Verify we have the expected mock devices
    expect(devices.length).toBe(5);

    // Check for specific expected devices
    const defaultDevice = devices.find(d => d.device_id === 'default');
    expect(defaultDevice).toBeDefined();
    expect(defaultDevice?.label).toBe('Default Audio Input');
    expect(defaultDevice?.kind).toBe('audioinput');
    expect(defaultDevice?.group_id).toBe(null);

    const builtInMic = devices.find(d => d.device_id === 'device-1');
    expect(builtInMic).toBeDefined();
    expect(builtInMic?.label).toBe('Built-in Microphone');
    expect(builtInMic?.kind).toBe('audioinput');
    expect(builtInMic?.group_id).toBe('group-1');

    const bluetoothMic = devices.find(d => d.device_id === 'device-3');
    expect(bluetoothMic).toBeDefined();
    expect(bluetoothMic?.label).toBe('Bluetooth Headset Microphone');
    expect(bluetoothMic?.kind).toBe('audioinput');
    expect(bluetoothMic?.group_id).toBe('group-3');
  });

  it('should return only audioinput devices', async () => {
    const devices = await getAudioDevices();

    // All mock devices should be audioinput type
    devices.forEach((device: AudioDevice) => {
      expect(device.kind).toBe('audioinput');
    });
  });

  it('should return devices with unique device IDs', async () => {
    const devices = await getAudioDevices();

    const deviceIds = devices.map(d => d.device_id);
    const uniqueDeviceIds = [...new Set(deviceIds)];

    expect(deviceIds.length).toBe(uniqueDeviceIds.length);
  });

  it('should handle multiple calls consistently', async () => {
    const devices1 = await getAudioDevices();
    const devices2 = await getAudioDevices();

    expect(devices1.length).toBe(devices2.length);
    
    // Compare each device
    devices1.forEach((device1, index) => {
      const device2 = devices2[index];
      expect(device1.device_id).toBe(device2.device_id);
      expect(device1.label).toBe(device2.label);
      expect(device1.kind).toBe(device2.kind);
      expect(device1.group_id).toBe(device2.group_id);
    });
  });

  it('should include devices with null group_id', async () => {
    const devices = await getAudioDevices();

    const devicesWithNullGroup = devices.filter(d => d.group_id === null);
    expect(devicesWithNullGroup.length).toBeGreaterThan(0);

    // Verify specific devices that should have null group_id
    const defaultDevice = devices.find(d => d.device_id === 'default');
    expect(defaultDevice?.group_id).toBe(null);

    const communicationsDevice = devices.find(d => d.device_id === 'communications');
    expect(communicationsDevice?.group_id).toBe(null);
  });

  it('should include devices with non-null group_id', async () => {
    const devices = await getAudioDevices();

    const devicesWithGroup = devices.filter(d => d.group_id !== null);
    expect(devicesWithGroup.length).toBeGreaterThan(0);

    // Verify specific devices that should have group_id
    const device1 = devices.find(d => d.device_id === 'device-1');
    expect(device1?.group_id).toBe('group-1');

    const device2 = devices.find(d => d.device_id === 'device-2');
    expect(device2?.group_id).toBe('group-2');
  });
});
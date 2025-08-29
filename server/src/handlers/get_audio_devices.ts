import { type AudioDevice } from '../schema';

export async function getAudioDevices(): Promise<AudioDevice[]> {
  try {
    // In a real-world scenario, this would be called from the client side using:
    // navigator.mediaDevices.enumerateDevices()
    // 
    // Since this is server-side code, we return mock data that represents
    // typical audio input devices that would be available on a user's system.
    // The actual device enumeration should happen on the client side and
    // the results can be passed to other handlers as needed.
    
    const mockDevices: AudioDevice[] = [
      {
        device_id: 'default',
        label: 'Default Audio Input',
        kind: 'audioinput',
        group_id: null
      },
      {
        device_id: 'communications',
        label: 'Communications Audio Input',
        kind: 'audioinput',
        group_id: null
      },
      {
        device_id: 'device-1',
        label: 'Built-in Microphone',
        kind: 'audioinput',
        group_id: 'group-1'
      },
      {
        device_id: 'device-2',
        label: 'External USB Microphone',
        kind: 'audioinput',
        group_id: 'group-2'
      },
      {
        device_id: 'device-3',
        label: 'Bluetooth Headset Microphone',
        kind: 'audioinput',
        group_id: 'group-3'
      }
    ];

    return mockDevices;
  } catch (error) {
    console.error('Failed to get audio devices:', error);
    throw error;
  }
}
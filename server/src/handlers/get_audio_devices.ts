import { type AudioDevice } from '../schema';

export async function getAudioDevices(): Promise<AudioDevice[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching available audio input devices for the audio source selector.
    // This will be used to populate the audio device selector in the UI.
    // Should return available microphones and audio input sources.
    return Promise.resolve([
        {
            device_id: 'default',
            label: 'Default Audio Input',
            kind: 'audioinput' as const,
            group_id: null
        }
    ]);
}
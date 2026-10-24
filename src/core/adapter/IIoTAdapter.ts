import { CustomCommand } from '../types/iot';

export interface IIoTAdapter {
  init(): void;
  destroy(): void;
  sendServoCommand(angle: number): Promise<boolean>;
  sendRgbCommand(color: string, state: 'ON' | 'OFF'): Promise<boolean>;
  sendCommand(command: CustomCommand): Promise<boolean>;
}

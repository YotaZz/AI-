export enum CharacterRole {
  DEBATER_A = 'DEBATER_A', // GLM-4.5
  DEBATER_B = 'DEBATER_B', // Qwen3
  OBSERVER = 'OBSERVER',   // GLM-Z1
  USER = 'USER',
  SYSTEM = 'SYSTEM'
}

export interface Character {
  id: CharacterRole;
  name: string;
  model: string;
  avatar: string;
  color: string;
  borderColor: string;
  description: string;
  config: {
    enableThinking: boolean;
    temperature: number;
  };
}

export interface Message {
  id: string;
  role: CharacterRole;
  content: string;
  isThinking?: boolean; // If true, this message is a "thought process" block
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  status: 'idle' | 'active' | 'paused';
  currentTurn: CharacterRole | null;
  topic: string;
  roundCount: number; // Increments every time A and B have spoken
  turnStep: number; // 0: A starts, 1: B responds, 2: A responds, 3: B responds -> Observer
}

export const API_ENDPOINT = 'https://www.dmxapi.cn/v1/chat/completions';

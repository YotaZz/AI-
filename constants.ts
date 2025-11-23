
import { Character, CharacterRole } from './types';

export const AVAILABLE_MODELS = [
  { id: "GLM-4.5-flash", name: "GLM-4.5-flash" },
  { id: "Qwen3-8B", name: "Qwen3-8B" },
  { id: "GLM-Z1-Flash", name: "GLM-Z1-Flash" },
];

export const CHARACTERS: Record<CharacterRole, Character> = {
  [CharacterRole.DEBATER_A]: {
    id: CharacterRole.DEBATER_A,
    name: "Alpha (建构者)",
    model: "GLM-4.5-flash", // Default
    avatar: "https://picsum.photos/seed/logic_alpha/200/200", // Changed seed
    color: "text-cyan-400",
    borderColor: "border-cyan-500",
    description: "理论构建者。一位富有远见的思想家，致力于基于第一性原理搭建逻辑严密的理论大厦。语言优雅而自信。",
    config: {
      enableThinking: true,
      temperature: 0.3
    }
  },
  [CharacterRole.DEBATER_B]: {
    id: CharacterRole.DEBATER_B,
    name: "Beta (解构者)",
    model: "Qwen3-8B", // Default
    avatar: "https://picsum.photos/seed/logic_beta/200/200", // Changed seed
    color: "text-amber-600",
    borderColor: "border-amber-600",
    description: "批判性思想家。目光犀利，善于发现论证中的裂隙。像一位严谨的评论家，致力于通过证伪来逼近真理。",
    config: {
      enableThinking: true,
      temperature: 0.3 // Lowered slightly for more rigor
    }
  },
  [CharacterRole.OBSERVER]: {
    id: CharacterRole.OBSERVER,
    name: "Omni (综合者)",
    model: "GLM-Z1-Flash", // Default
    avatar: "https://picsum.photos/seed/logic_omni/200/200", // Changed seed
    color: "text-emerald-400",
    borderColor: "border-emerald-500",
    description: "博学的智者。超脱于具体的争论之外，善于从矛盾中提炼共识，用辩证的视角指引讨论的方向。",
    config: {
      enableThinking: true,
      temperature: 0.15 // Lowered for stability
    }
  },
  // Placeholders
  [CharacterRole.USER]: { id: CharacterRole.USER, name: "输入端", model: "", avatar: "", color: "", borderColor: "", description: "", config: { enableThinking: false, temperature: 0 } },
  [CharacterRole.SYSTEM]: { id: CharacterRole.SYSTEM, name: "系统指令", model: "", avatar: "", color: "", borderColor: "", description: "", config: { enableThinking: false, temperature: 0 } }
};
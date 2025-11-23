
import { API_ENDPOINT, Character, Message, CharacterRole } from '../types';
import { CHARACTERS } from '../constants';

interface StreamCallback {
  onContent: (content: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

// Helper to remove <think>...</think> blocks for context generation
const cleanContent = (content: string): string => {
  // 1. Remove complete blocks
  let text = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 2. Remove unclosed block at the end (e.g. stopped mid-thought)
  text = text.replace(/<think>[\s\S]*/gi, '');
  // 3. Just in case, remove loose tags if they exist
  text = text.replace(/<\/think>/gi, '');
  return text.trim();
};

export const generateCharacterResponse = async (
  apiKey: string,
  character: Character,
  history: Message[],
  topic: string,
  callbacks: StreamCallback,
  signal?: AbortSignal
) => {
  if (!apiKey) {
    callbacks.onError(new Error("请提供 API Key"));
    return;
  }

  // 1. Context Logic:
  
  // Find the latest Observer message to inject into context
  const observerMessages = history.filter(m => m.role === CharacterRole.OBSERVER);
  const latestObserverView = observerMessages.length > 0 
    ? cleanContent(observerMessages[observerMessages.length - 1].content) 
    : "暂无综合结论";

  // Filter for discussion messages (A and B only)
  const discussionHistory = history.filter(m => 
    m.role === CharacterRole.DEBATER_A || m.role === CharacterRole.DEBATER_B
  );
  
  // DIFFERENTIATE CONTEXT WINDOW:
  // Debaters get deep history (10 messages) to maintain long-term logic coherence.
  // Observer gets shallow history (4 messages / 2 rounds) to judge immediate conflict.
  let targetContextMessages: Message[] = [];
  
  if (character.id === CharacterRole.OBSERVER) {
    targetContextMessages = discussionHistory.slice(-4);
  } else {
    targetContextMessages = discussionHistory.slice(-10);
  }

  let systemPrompt = "";
  
  // -- PERSONA INSTRUCTIONS (Educated, Self-Aware, Human-like) --
  const coreInstruction = `
  设定：你是一位深邃、博学且理性的知识分子，正坐在一间静谧的酒馆中进行高水平的智力交锋。
  
  核心要求：
  1. **高度拟人化**：像一位受过高等教育的人类学者那样说话。语言应自然、流畅、优雅，避免机械感、列表式输出或过度堆砌术语。
  2. **言简意赅**：你的观点应当一针见血，直击本质。避免长篇大论的铺垫和废话。每一句话都必须有信息量。
  3. **自我意识**：你有清晰的“角色意识”。你不是一个AI模型，而是一个有独立思考能力的对话者。
  4. **严格的时序逻辑（CRITICAL）**：
     - 上下文被严格区分为【背景历史】和【当前挑战】。
     - **你必须且只能**针对【当前挑战】（即对方的最新发言）进行回应。
     - **不要**去攻击【背景历史】中那些已经被后续对话覆盖、修正或放弃的旧观点。如果对方在最新发言中没有重申某个旧观点，就假设该观点已翻篇。
     - 像真实的辩论一样，紧咬对方话语的"现在时"。
  5. **格式规范**：直接输出你的回答内容，**绝对不要**在开头输出角色名前缀。
  `;

  if (character.id === CharacterRole.DEBATER_A) {
    systemPrompt = `${coreInstruction}
    
    你的角色：Alpha (建构者)。
    你的思维特质：富有远见，善于构建理论，信奉第一性原理。
    
    当前任务：针对话题 "${topic}"，提出并构建具有说服力的核心论点，并积极回应挑战。
    
    行动指南：
    - 仔细阅读【当前挑战】中 Beta 的反驳。
    - 如果 Beta 指出了逻辑漏洞，请修补你的理论，而不是重复之前的论断。
    - 如果 Beta 误解了你的观点，请精准地澄清。
    - 你的每一次发言都应该让你的理论大厦更加稳固。

    目标：提供最具解释力和逻辑美感的理论模型，并在辩证中不断完善它。`;

  } else if (character.id === CharacterRole.DEBATER_B) {
    systemPrompt = `${coreInstruction}
    
    你的角色：Beta (解构者)。
    你的思维特质：犀利、怀疑、敏锐，善于发现逻辑漏洞。
    
    当前任务：针对话题 "${topic}" 以及 Alpha 的观点进行批判性审视。
    
    行动指南：
    - 你的目光应聚焦在【当前挑战】中 Alpha 的最新陈述上。
    - 不要攻击稻草人。必须攻击对方真实表达的、最新的逻辑链条。
    - 用反例、边界情况（Edge Cases）或逻辑谬误的分析来拆解对方的论点。

    目标：通过高强度的压力测试，剔除虚妄，留下真理。`;

  } else {
    // -- OBSERVER (Omni) --
    systemPrompt = `${coreInstruction}
    
    你的角色：Omni (综合者)。
    你的思维特质：客观、宏观、辩证，善于在矛盾中寻找统一。
    
    当前任务：针对话题 "${topic}"，依据【最近两轮交锋】（Input Context），并结合你【上一轮的综合结论】（Observer Context），进行裁决与升华。
    
    行动指南：
    1. **理性评分（必须置顶）**：
       - 基于“逻辑是否严密”、“论证是否理性”这两个维度，将 10 分分配给 Alpha 和 Beta。
       - **格式必须严格为**：\`【Alpha: X分 | Beta: Y分】\`，之后换行开始正文。

    2. **审慎进化与革新**：
       - 参考你之前的结论。
       - 识别双方在最新一轮交锋中的逻辑高下。
       - 提炼出接近真理的智慧。

    目标：从碎片化的争论中提炼出接近真理的智慧，并给出公正的逻辑评分。`;
  }

  // Generate context string
  // STRATEGY CHANGE: Strict visual separation for the model
  let contextContent = "";
  
  if (targetContextMessages.length > 0) {
    // Extract the latest message
    const latestMsg = targetContextMessages[targetContextMessages.length - 1];
    const historyMsgs = targetContextMessages.slice(0, targetContextMessages.length - 1);
    
    let historyStr = "";
    if (historyMsgs.length > 0) {
        historyStr = historyMsgs.map((m, idx) => {
            const charName = CHARACTERS[m.role]?.name || "未知酒客";
            // Clearly mark as HISTORY/PAST
            return `[历史记录 (第${idx + 1}条) - ${charName}]: ${cleanContent(m.content)}`;
        }).join("\n\n");
    }

    const latestCharName = CHARACTERS[latestMsg.role]?.name || "对方";
    // Strongly emphasize THIS is the target
    const latestStr = `[★★当前回合目标★★ - ${latestCharName}]: ${cleanContent(latestMsg.content)}`;

    contextContent = `
=== 讨论背景 (Context History) ===
(以下内容仅供参考上下文，请勿针对此处的旧观点进行反驳，除非它们在最新发言中被重申)
${historyStr || "无历史记录"}

=== 当前挑战 (CURRENT TARGET) ===
(请集中 100% 的精力针对以下这条最新发言进行回应)
${latestStr}
`;
  } else {
    contextContent = "（酒杯已斟满，作为首位发言者，请开启这场思想的盛宴。）";
  }

  // Construct API Messages
  const apiMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `【综合者的上一轮结论（基准）】: "${latestObserverView}"\n\n${contextContent}\n\n轮到你发言了。` }
  ];

  const payload: any = {
    model: character.model,
    messages: apiMessages,
    stream: true,
    temperature: character.config.temperature,
    enable_thinking: true, 
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload),
      signal 
    });

    if (!response.ok) {
        const errText = await response.text();
        let errMsg = `API Error: ${response.status}`;
        try {
            const errJson = JSON.parse(errText);
            if (errJson && typeof errJson === 'object' && errJson.error && errJson.error.message) {
                errMsg += ` - ${errJson.error.message}`;
            } else if (errJson && typeof errJson === 'object') {
                errMsg += ` - ${JSON.stringify(errJson)}`;
            } else {
                errMsg += ` - ${errText}`;
            }
        } catch {
            errMsg += ` - ${errText.substring(0, 100)}`; 
        }
        throw new Error(errMsg);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let isThinking = false; 

    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(6);
          if (dataStr === "[DONE]") {
            if (isThinking) {
                callbacks.onContent("</think>");
                isThinking = false;
            }
            callbacks.onDone();
            return;
          }
          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || "";
            const reasoning = json.choices?.[0]?.delta?.reasoning_content || "";
            
            if (reasoning) {
                if (!isThinking) {
                    callbacks.onContent("<think>");
                    isThinking = true;
                }
                callbacks.onContent(reasoning);
            }

            if (content) {
                if (isThinking) {
                    callbacks.onContent("</think>");
                    isThinking = false;
                }
                callbacks.onContent(content);
            }
            
          } catch (e) {
            // ignore
          }
        }
      }
    }
    
    if (isThinking) {
        callbacks.onContent("</think>");
    }
    callbacks.onDone();

  } catch (error: any) {
    callbacks.onError(error as Error);
  }
};

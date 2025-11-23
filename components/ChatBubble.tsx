import React, { useRef, useState } from 'react';
import { Message, CharacterRole } from '../types';
import { CHARACTERS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  message: Message;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, fontSize = 'base' }) => {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const isUser = message.role === CharacterRole.USER;
  const isSystem = message.role === CharacterRole.SYSTEM;
  const char = CHARACTERS[message.role];
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 1. 字号整体平移设置
  // 用户气泡 (User)
  const userTextSize = {
    sm: 'text-lg',       // 原 base -> 现 lg (常规即为大字)
    base: 'text-xl',     // 原 lg -> 现 xl (大号即为之前的特大)
    lg: 'text-2xl',      // 原 xl -> 现 2xl
    xl: 'text-3xl'       // 新增超大 3xl
  }[fontSize];

  // AI 气泡 (Markdown)
  const aiProseSize = {
    sm: 'prose-lg',      // 常规起始为 lg
    base: 'prose-xl',    // 大号为 xl
    lg: 'prose-2xl',     // 特大为 2xl
    xl: 'prose-2xl'      // 超大维持 2xl (Standard Tailwind Prose 最大通常为 2xl，已非常巨大)
  }[fontSize];

  if (isSystem) {
    return (
      <div ref={bubbleRef} className="flex justify-center my-4 opacity-60">
        <span className="text-sm italic text-parchment-200 border-b border-parchment-800 pb-1">{message.content}</span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div ref={bubbleRef} className="flex justify-end my-4 px-4">
        <div className="max-w-[80%] bg-wood-800 border border-parchment-800 rounded-lg p-3 text-parchment-100 shadow-lg">
          {/* 应用新的用户字号 */}
          <p className={`font-serif ${userTextSize}`}>
             {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (!char) {
    return null;
  }

  let thinkingContent = null;
  let mainContent = message.content;

  const thinkMatch = message.content.match(/<think>(.*?)<\/think>/s);
  
  if (thinkMatch) {
      thinkingContent = thinkMatch[1].trim();
      mainContent = message.content.replace(/<think>.*?<\/think>/s, '').trim();
  } else if (message.content.includes('<think>')) {
      const parts = message.content.split('<think>');
      mainContent = parts[0].trim();
      thinkingContent = parts[1]?.trim() || "Thinking...";
  }

  return (
    <div ref={bubbleRef} className={`flex my-6 px-4 gap-4 ${message.role === CharacterRole.DEBATER_B ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0 mt-1">
        <img 
          src={char.avatar} 
          alt={char.name} 
          className={`w-12 h-12 rounded-full border border-parchment-800 object-cover`} // 头像稍微调大一点点 w-10 -> w-12
        />
      </div>

      <div className={`flex flex-col max-w-[85%] ${message.role === CharacterRole.DEBATER_B ? 'items-end' : 'items-start'}`}>
        <span className={`text-sm font-bold mb-1 ${char.color}`}>{char.name}</span>
        
        <div className={`relative p-5 rounded-lg bg-black/40 border ${char.borderColor} backdrop-blur-sm shadow-xl w-full`}>
           <div className={`absolute top-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent 
              ${message.role === CharacterRole.DEBATER_B 
                ? '-right-2 border-l-[8px] border-l-stone-900' 
                : '-left-2 border-r-[8px] border-r-stone-900'} 
           `} />
           
           <div className="text-parchment-100 font-serif">
             {thinkingContent && (
                <details 
                  className="mb-4 group" 
                  open={isThinkingOpen}
                  onToggle={(e) => setIsThinkingOpen(e.currentTarget.open)}
                >
                    <summary className="cursor-pointer text-xs uppercase tracking-widest text-parchment-800 hover:text-amber-500 flex items-center gap-1 select-none">
                        <span className="group-open:rotate-90 transition-transform">▶</span>
                        思维链 (Thinking Process)
                    </summary>
                    <div className="mt-2 pl-3 border-l-2 border-parchment-800/30 text-sm italic whitespace-pre-wrap leading-relaxed text-parchment-200/60">
                        {thinkingContent}
                    </div>
                </details>
             )}
             
             {/* 应用新的 AI 字号 */}
             <div className={`prose prose-invert ${aiProseSize} prose-p:leading-relaxed prose-strong:text-amber-500 max-w-none`}>
                <ReactMarkdown>{mainContent}</ReactMarkdown>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
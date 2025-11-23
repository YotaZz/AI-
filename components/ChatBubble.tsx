// yotazz/ai-/AI--40bcc9bbbecb5a08900db605012cab3c16cdbb22/components/ChatBubble.tsx

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

  // 1. 定义字号映射配置 (解决动态类名不生效问题 + 实现字号升级)
  // 用户气泡 (User) 使用 text-* 类
  const userTextSize = {
    sm: 'text-base',      // 原 sm -> 现 base (16px)
    base: 'text-lg',      // 原 base -> 现 lg (18px, 对应之前的XL)
    lg: 'text-xl',        // 新增更大一级 (20px)
    xl: 'text-2xl'        // 新增最大一级 (24px)
  }[fontSize];

  // AI 气泡 (Markdown) 使用 prose-* 类
  const aiProseSize = {
    sm: 'prose-base',     // 16px
    base: 'prose-lg',     // 18px
    lg: 'prose-xl',       // 20px
    xl: 'prose-2xl'       // 24px
  }[fontSize];

  if (isSystem) {
    return (
      <div ref={bubbleRef} className="flex justify-center my-4 opacity-60">
        <span className="text-xs italic text-parchment-200 border-b border-parchment-800 pb-1">{message.content}</span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div ref={bubbleRef} className="flex justify-end my-4 px-4">
        <div className="max-w-[80%] bg-wood-800 border border-parchment-800 rounded-lg p-3 text-parchment-100 shadow-lg">
          {/* 应用用户字号映射 */}
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
          className={`w-10 h-10 rounded-full border border-parchment-800 object-cover`}
        />
      </div>

      <div className={`flex flex-col max-w-[85%] ${message.role === CharacterRole.DEBATER_B ? 'items-end' : 'items-start'}`}>
        <span className={`text-xs font-bold mb-1 ${char.color}`}>{char.name}</span>
        
        <div className={`relative p-4 rounded-lg bg-black/40 border ${char.borderColor} backdrop-blur-sm shadow-xl w-full`}>
           {/* Decorative Triangle */}
           <div className={`absolute top-3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent 
              ${message.role === CharacterRole.DEBATER_B 
                ? '-right-2 border-l-[8px] border-l-stone-900' 
                : '-left-2 border-r-[8px] border-r-stone-900'} 
           `} />
           
           <div className="text-parchment-100 font-serif">
             {thinkingContent && (
                <details 
                  className="mb-3 group" 
                  open={isThinkingOpen}
                  onToggle={(e) => setIsThinkingOpen(e.currentTarget.open)}
                >
                    <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-parchment-800 hover:text-amber-500 flex items-center gap-1 select-none">
                        <span className="group-open:rotate-90 transition-transform">▶</span>
                        思维链 (Thinking Process)
                    </summary>
                    <div className="mt-2 pl-3 border-l-2 border-parchment-800/30 text-parchment-200/60 text-xs italic whitespace-pre-wrap leading-relaxed">
                        {thinkingContent}
                    </div>
                </details>
             )}
             
             {/* 2. 应用 AI 字号映射 (确保 prose-lg/xl/2xl 生效) */}
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
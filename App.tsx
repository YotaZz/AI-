import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CharacterRole, ChatState } from './types';
import { CHARACTERS, AVAILABLE_MODELS } from './constants';
import { generateCharacterResponse } from './services/dmxService';
import Avatar from './components/Avatar';
import ChatBubble from './components/ChatBubble';

const DEFAULT_API_KEY = "";

type FontSize = 'sm' | 'base' | 'lg' | 'xl';

const App: React.FC = () => {
  const getInitialKey = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dmx_api_key');
      if (stored && stored.length > 10) { 
        return stored;
      }
    }
    return DEFAULT_API_KEY;
  };

  const getInitialFontSize = (): FontSize => {
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('dmx_font_size');
          if (stored && ['sm', 'base', 'lg', 'xl'].includes(stored)) {
              return stored as FontSize;
          }
      }
      return 'base'; // 默认中号
  };

  const [apiKey, setApiKey] = useState<string>(getInitialKey);
  const [fontSize, setFontSize] = useState<FontSize>(getInitialFontSize);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempKey, setTempKey] = useState(getInitialKey);
  
  const [modelConfig, setModelConfig] = useState<Record<CharacterRole, string>>({
    [CharacterRole.DEBATER_A]: CHARACTERS[CharacterRole.DEBATER_A].model,
    [CharacterRole.DEBATER_B]: CHARACTERS[CharacterRole.DEBATER_B].model,
    [CharacterRole.OBSERVER]: CHARACTERS[CharacterRole.OBSERVER].model,
    [CharacterRole.USER]: "",
    [CharacterRole.SYSTEM]: ""
  });

  const [input, setInput] = useState('');
  const [state, setState] = useState<ChatState>({
    messages: [],
    status: 'idle',
    currentTurn: null,
    topic: '',
    roundCount: 0,
    turnStep: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const mainRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const apiKeyRef = useRef(apiKey); 
  apiKeyRef.current = apiKey;
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!getInitialKey()) {
      setShowConfigModal(true);
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('dmx_font_size', fontSize);
  }, [fontSize]);

  const handleSaveConfig = () => {
    if (tempKey.trim()) {
      localStorage.setItem('dmx_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
    }
    setShowConfigModal(false);
  };

  const addMessage = (role: CharacterRole, content: string, idOverride?: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: idOverride || Date.now().toString(),
          role,
          content,
          timestamp: Date.now()
        }
      ]
    }));
  };

  const updateLastMessage = (content: string) => {
    setState(prev => {
      const msgs = [...prev.messages];
      if (msgs.length > 0) {
        const lastIndex = msgs.length - 1;
        msgs[lastIndex] = { ...msgs[lastIndex], content };
      }
      return { ...prev, messages: msgs };
    });
  };

  const startDiscussion = () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setShowConfigModal(true);
      return;
    }
    setState({
      messages: [
        { id: 'init', role: CharacterRole.SYSTEM, content: `酒馆大门缓缓打开。今晚的话题是: "${input}"`, timestamp: Date.now() },
        { id: 'user-topic', role: CharacterRole.USER, content: input, timestamp: Date.now() }
      ],
      status: 'active',
      currentTurn: CharacterRole.DEBATER_A,
      topic: input,
      roundCount: 0,
      turnStep: 0,
    });
    setInput('');
  };

  const stopDiscussion = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
    }
    setState(prev => ({...prev, status: 'paused', currentTurn: null}));
  };

  const triggerTurn = useCallback(async () => {
    const { currentTurn, messages, topic, status } = stateRef.current;
    const key = apiKeyRef.current;
    
    if (status !== 'active' || !currentTurn) return;

    const charData = CHARACTERS[currentTurn];
    if (!charData) { return; }

    const character = { ...charData, model: modelConfig[currentTurn] };
    
    addMessage(currentTurn, "思考中...");
    let accumulated = "";

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let lastScrollTime = 0;

    await generateCharacterResponse(
      key, character, messages, topic,
      {
        onContent: (chunk) => {
          accumulated += chunk;
          updateLastMessage(accumulated);
          const now = Date.now();
          if (now - lastScrollTime > 30) {
              lastScrollTime = now;
              requestAnimationFrame(() => {
                if (!mainRef.current) return;
                const target = mainRef.current;
                const threshold = 50; 
                const { scrollHeight, scrollTop, clientHeight } = target;
                if (scrollHeight - scrollTop - clientHeight < threshold) {
                   target.scrollTo({ top: scrollHeight, behavior: 'auto' });
                }
              });
          }
        },
        onError: (e) => {
          if (e.name === 'AbortError') return;
          console.error(e);
          const errorMessage = (e && e instanceof Error) ? e.message : String(e || "Unknown error");
          let countdown = 60;
          const updateErrorMsg = (sec: number) => {
              updateLastMessage(`*酒客尴尬地咳嗽了一声。* (连接中断: ${errorMessage})\n\n[系统]: 连接不稳定，${sec}秒后尝试重新连接...`);
          };
          updateErrorMsg(countdown);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = setInterval(() => {
              countdown--;
              if (countdown <= 0) {
                  if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              } else {
                  updateErrorMsg(countdown);
              }
          }, 1000);
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              if (stateRef.current.status === 'active') triggerTurn();
          }, 60000);
        },
        onDone: () => {
          abortControllerRef.current = null;
          requestAnimationFrame(() => {
             if (mainRef.current) {
                 const target = mainRef.current;
                 const threshold = 100;
                 const { scrollHeight, scrollTop, clientHeight } = target;
                 if (scrollHeight - scrollTop - clientHeight < threshold) {
                    target.scrollTo({ top: scrollHeight, behavior: 'smooth' });
                 }
             }
          });
          advanceTurn();
        }
      },
      abortController.signal
    );
  }, [modelConfig]);

  const advanceTurn = () => {
    setState(prev => {
      if (prev.status !== 'active') return prev;
      let nextStep = prev.turnStep + 1;
      let nextRound = prev.roundCount;
      let nextTurn: CharacterRole | null = null;
      if (prev.turnStep === 0) { nextTurn = CharacterRole.DEBATER_B; } 
      else if (prev.turnStep === 1) { nextTurn = CharacterRole.DEBATER_A; nextRound++; } 
      else if (prev.turnStep === 2) { nextTurn = CharacterRole.DEBATER_B; } 
      else if (prev.turnStep === 3) { nextTurn = CharacterRole.OBSERVER; nextRound++; } 
      else if (prev.turnStep === 4) { nextTurn = CharacterRole.DEBATER_A; nextStep = 0; }
      return { ...prev, currentTurn: nextTurn, turnStep: nextStep, roundCount: nextRound };
    });
  };

  useEffect(() => {
    if (state.status === 'active' && state.currentTurn) {
        const timer = setTimeout(() => triggerTurn(), 1000);
        return () => clearTimeout(timer);
    }
  }, [state.currentTurn, state.status, triggerTurn]);

  useEffect(() => {
    if (state.messages.length > 0) {
        requestAnimationFrame(() => {
             if (mainRef.current) {
                 const target = mainRef.current;
                 const threshold = 100;
                 const { scrollHeight, scrollTop, clientHeight } = target;
                 if (scrollHeight - scrollTop - clientHeight < threshold) {
                     target.scrollTo({ top: scrollHeight, behavior: 'smooth' });
                 }
             }
        });
    }
  }, [state.messages.length]);

  return (
    <div className="fixed inset-0 bg-wood-900 text-parchment-100 font-sans selection:bg-amber-900 selection:text-white flex flex-col lg:flex-row items-center lg:items-stretch" style={{ overflowAnchor: 'none' }}>
      
      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-wood-800 border-2 border-amber-700 p-8 rounded-lg shadow-2xl max-w-lg w-full relative">
             <h2 className="text-2xl font-serif text-amber-500 mb-6 text-center border-b border-amber-900/50 pb-4">酒馆设置</h2>
             <div className="mb-6">
                <label className="block text-parchment-200 text-sm uppercase tracking-wider mb-2">DMXAPI 密钥</label>
                <input type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder="API Key (sk-...)" className="w-full bg-black/50 border border-parchment-800 rounded p-2 text-parchment-100 focus:border-amber-500 outline-none font-mono text-base"/>
            </div>

            <div className="mb-6">
                <label className="block text-parchment-200 text-sm uppercase tracking-wider mb-2">聊天字号</label>
                <div className="flex gap-2 bg-black/30 p-1 rounded border border-parchment-800/50">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                        <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={`flex-1 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all
                                ${fontSize === size 
                                    ? 'bg-amber-700 text-white shadow-lg' 
                                    : 'text-parchment-200/50 hover:bg-white/5 hover:text-parchment-200'
                                }
                            `}
                        >
                            {size === 'sm' ? '常规' : size === 'base' ? '大' : size === 'lg' ? '特大' : '超大'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <label className="block text-parchment-200 text-sm uppercase tracking-wider border-b border-parchment-800/30 pb-1">角色模型分配</label>
                <div className="grid grid-cols-1 gap-4">
                    {[CharacterRole.DEBATER_A, CharacterRole.DEBATER_B, CharacterRole.OBSERVER].map(role => (
                        <div key={role} className="flex items-center justify-between">
                            <span className={`text-base font-bold ${CHARACTERS[role].color}`}>{CHARACTERS[role].name}</span>
                            <select value={modelConfig[role]} onChange={(e) => setModelConfig({...modelConfig, [role]: e.target.value})} className="bg-black/30 border border-parchment-800 rounded text-sm p-2 text-parchment-100 w-48 outline-none">
                                {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleSaveConfig} className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2.5 rounded font-bold transition-colors w-full text-base">进入酒馆</button>
            </div>
          </div>
        </div>
      )}

      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black opacity-80"></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none lg:hidden"></div>
      
      {/* HEADER / SIDEBAR */}
      <header className="flex-shrink-0 w-full lg:w-80 xl:w-[360px] z-20 flex flex-col items-center transition-all duration-300 bg-gradient-to-b lg:bg-gradient-to-r from-black/40 to-transparent lg:border-r lg:border-white/5 lg:backdrop-blur-sm lg:h-full lg:justify-center">
        <div className="w-full p-6 flex flex-col items-center h-full lg:justify-center">
            <h1 className="text-3xl lg:text-4xl font-serif text-amber-500 tracking-widest uppercase mb-2 drop-shadow-md pointer-events-auto text-center">AI 深思酒馆</h1>
            <p className="text-parchment-200/60 text-base mb-8 lg:mb-0 pointer-events-auto text-center lg:absolute lg:top-24">深度思维 · 观点演化</p>

            <div className="flex w-full justify-around items-end h-32 lg:h-auto lg:flex-col lg:items-center lg:justify-center lg:gap-20 mb-4 relative pointer-events-auto lg:flex-1 lg:w-full">
                <div className="flex flex-col items-center w-1/3 lg:w-full transition-transform duration-500 z-10">
                    <Avatar 
                        character={CHARACTERS[CharacterRole.DEBATER_A]} 
                        isActive={state.currentTurn === CharacterRole.DEBATER_A} 
                        modelName={modelConfig[CharacterRole.DEBATER_A]}
                    />
                </div>
                <div className="flex flex-col items-center w-1/3 lg:w-full lg:mb-0 -mb-8 z-0 opacity-90 lg:opacity-100">
                    <Avatar 
                        character={CHARACTERS[CharacterRole.OBSERVER]} 
                        isActive={state.currentTurn === CharacterRole.OBSERVER}
                        size="sm" 
                        modelName={modelConfig[CharacterRole.OBSERVER]}
                    />
                </div>
                <div className="flex flex-col items-center w-1/3 lg:w-full transition-transform duration-500 z-10">
                    <Avatar 
                        character={CHARACTERS[CharacterRole.DEBATER_B]} 
                        isActive={state.currentTurn === CharacterRole.DEBATER_B} 
                        modelName={modelConfig[CharacterRole.DEBATER_B]}
                    />
                </div>
            </div>

            <div className="h-6 mt-4 lg:mt-0 lg:absolute lg:bottom-10 text-center">
                {state.status === 'active' && state.currentTurn && (
                    <p className="text-sm uppercase tracking-widest text-parchment-200 animate-pulse bg-black/30 px-3 py-1 rounded-full border border-white/10">
                        正在发言: {CHARACTERS[state.currentTurn].name}
                    </p>
                )}
            </div>
        </div>
      </header>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 w-full h-full relative flex flex-col overflow-hidden">
          <main 
            ref={mainRef}
            className="flex-1 w-full z-10 relative overflow-y-auto scroll-smooth"
          >
            <div className="max-w-3xl lg:max-w-6xl mx-auto px-4 pb-32 lg:pt-10">
                <div className="space-y-2">
                    {state.messages.length === 0 && (
                        <div className="text-center mt-20 opacity-40 lg:mt-40">
                            <p className="text-4xl mb-4">🍺</p>
                            <p className="font-serif text-lg">酒馆很安静。请开启一个话题。</p>
                        </div>
                    )}
                    {state.messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} fontSize={fontSize} />
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>
          </main>

          {/* Input Controls */}
          <footer className="absolute bottom-0 w-full bg-gradient-to-t from-wood-900 via-wood-900 to-transparent pt-12 pb-8 px-4 z-30">
            <div className="max-w-3xl lg:max-w-6xl mx-auto flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && state.status !== 'active' && startDiscussion()}
                    disabled={state.status === 'active'}
                    placeholder={state.status === 'active' ? "正在聆听讨论..." : "输入话题 (例如：自由意志存在吗？)"}
                    className="flex-1 bg-black/60 border border-parchment-800 rounded-md px-4 py-3 text-lg text-parchment-100 placeholder-parchment-800 focus:outline-none focus:border-amber-600 transition-colors disabled:opacity-50 font-serif shadow-2xl"
                />
                <button 
                    onClick={startDiscussion}
                    disabled={state.status === 'active' || !input.trim()}
                    className="bg-amber-800 hover:bg-amber-700 disabled:bg-stone-800 disabled:text-stone-600 text-parchment-100 font-bold py-2 px-6 rounded-md shadow-lg transition-all border border-amber-900 font-serif uppercase tracking-wider whitespace-nowrap text-lg"
                >
                    {state.status === 'active' ? '讨论中' : '开始'}
                </button>
                <button
                    onClick={() => setShowConfigModal(true)}
                    className="bg-stone-800 hover:bg-stone-700 text-parchment-200 px-4 rounded-md border border-stone-600 text-xl"
                    title="设置与密钥"
                >
                    ⚙️
                </button>
            </div>
            {state.status === 'active' && (
                 <button 
                    onClick={stopDiscussion}
                    className="mx-auto block mt-2 text-sm text-red-400 hover:text-red-300 underline cursor-pointer z-40 relative"
                 >
                    停止讨论
                 </button>
            )}
          </footer>
      </div>
    </div>
  );
};

export default App;
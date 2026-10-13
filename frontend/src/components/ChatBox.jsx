import React, { useCallback, useEffect, useRef, useState } from 'react';
import MessageList from './MessageList';
import ProductGrid from './ProductGrid';
import { AvatarScene } from '../avatar/AvatarScene';
import { deriveAvatarBehaviorFromText, getStateBehavior, normalizeAvatarBehavior } from '../avatar/AvatarStateManager';
import { mapBehaviorToAvatarCommands } from '../avatar/BehaviorMapper';
import { useVoice } from '../hooks/useVoice';
import { sendChatMessage } from '../services/api';

const QUICK_BUTTONS = [
    { label: 'Mahsulotlar', text: 'Qanday mahsulotlar bor?' },
    { label: 'Shirinlik', text: 'Shirinlik yoki desert korsating' },
    { label: 'Ichimlik', text: 'Ichimlik tavsiya qiling' },
    { label: 'Arzonroq', text: 'Eng arzon mahsulotlarni korsating' },
];

const pickAnimationFromResponse = (data) => {
    const text = `${data.text || ''} ${data.tts_text || ''}`.toLowerCase();

    if (/\b(salom|assalomu|xush kelibsiz|men yasi|ismim yasi|3d|avatar|yordamchingiz)\b/.test(text)) {
        return 'wave';
    }

    if (/\b(ha|albatta|tushunarli|mayli|togri|to'g'ri|rahmat)\b/.test(text)) {
        return 'nod';
    }

    if (data.action === 'show_products' || data.action === 'show_info') {
        return 'explain';
    }

    if (data.animation && data.animation !== 'idle') {
        return data.animation;
    }

    if (data.emotion === 'thinking' || data.emotion === 'informative') {
        return 'explain';
    }

    return data.animation || 'idle';
};

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const [emotion, setEmotion] = useState('neutral');
    const [animation, setAnimation] = useState('idle');
    const [animationNonce, setAnimationNonce] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [avatarBehavior, setAvatarBehavior] = useState(() => getStateBehavior('idle'));
    const [avatarEnabled, setAvatarEnabled] = useState(() => localStorage.getItem('avatar_enabled') !== 'false');
    const [lipSyncEnabled, setLipSyncEnabled] = useState(() => localStorage.getItem('avatar_lipsync_enabled') !== 'false');
    const currentAnimationRef = useRef('idle');
    const voiceModeRef = useRef(false);

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const handleSendRef = useRef(null);

    const onFinalTranscript = useCallback((text) => {
        if (!text.trim() || isLoading) return;
        setInputValue('');
        handleSendRef.current?.(text);
    }, [isLoading]);

    const onPartialTranscript = useCallback((text) => {
        setInputValue(text);
    }, []);

    const {
        isListening,
        partialText,
        isSupported,
        startListening,
        stopListening,
        setAudioSampleRate,
        playAudioChunk,
        stopAudio,
        waitForAudioCompletion,
        lipSyncLevel,
    } = useVoice({ onFinalTranscript, onPartialTranscript });

    const behaviorCommands = mapBehaviorToAvatarCommands(avatarBehavior);

    const applyAvatarBehavior = useCallback((behavior, fallbackText = '') => {
        const nextBehavior = behavior
            ? normalizeAvatarBehavior(behavior)
            : deriveAvatarBehaviorFromText(fallbackText);
        setAvatarBehavior(nextBehavior);
        const commands = mapBehaviorToAvatarCommands(nextBehavior);
        setAnimation(commands.animation);
        setAnimationNonce((value) => value + 1);
    }, []);

    const connectWebSocket = useCallback(() => {
        if (wsRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(wsRef.current.readyState)) {
            return wsRef.current;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//127.0.0.1:8000/ws/assistant`;
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket ulandi');
        };

        ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'state') {
                        if (data.text) setMessages((prev) => [...prev, { sender: 'assistant', text: data.text }]);
                        if (data.products) setProducts(data.products);
                        if (data.emotion) setEmotion(data.emotion);
                        applyAvatarBehavior(data.avatar_behavior, data.text || '');
                        setIsLoading(false);
                    } else if (data.type === 'audio_start') {
                        setAudioSampleRate(data.sample_rate);
                        setAvatarBehavior((prev) => normalizeAvatarBehavior({ ...prev, state: 'speaking' }));
                        if (!['wave', 'nod'].includes(currentAnimationRef.current)) {
                            setAnimation('talking');
                            setAnimationNonce((value) => value + 1);
                        }
                        setIsSpeaking(true);
                    } else if (data.type === 'audio_end') {
                        waitForAudioCompletion(() => {
                            setAnimation('idle');
                            setAnimationNonce((value) => value + 1);
                            setIsSpeaking(false);
                            setAvatarBehavior(getStateBehavior('idle'));
                            if (!data.interrupted && voiceModeRef.current) {
                                startListening();
                            }
                        });
                    }
                } catch (e) {
                    console.error('WS xabarini oqib bolmadi', e);
                }
            } else {
                playAudioChunk(event.data);
            }
        };

        ws.onerror = (err) => console.error('WS xatosi', err);
        ws.onclose = () => {
            console.log('WS yopildi');
            if (!reconnectTimerRef.current) {
                reconnectTimerRef.current = window.setTimeout(() => {
                    reconnectTimerRef.current = null;
                    connectWebSocket();
                }, 1200);
            }
        };

        wsRef.current = ws;
        return ws;
    }, [applyAvatarBehavior, playAudioChunk, setAudioSampleRate, startListening, waitForAudioCompletion]);

    const waitForSocket = useCallback(() => new Promise((resolve) => {
        const ws = connectWebSocket();
        if (ws.readyState === WebSocket.OPEN) {
            resolve(ws);
            return;
        }

        const timeout = window.setTimeout(() => resolve(null), 1800);
        ws.addEventListener('open', () => {
            window.clearTimeout(timeout);
            resolve(ws);
        }, { once: true });
        ws.addEventListener('error', () => {
            window.clearTimeout(timeout);
            resolve(null);
        }, { once: true });
    }), [connectWebSocket]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }
            wsRef.current?.close();
        };
    }, [connectWebSocket]);

    const handleSend = useCallback(async (text) => {
        if (!text.trim() || isLoading) return;

        stopListening();
        stopAudio();
        setIsSpeaking(false);
        setAvatarBehavior(getStateBehavior('thinking'));

        setMessages((prev) => [...prev, { sender: 'user', text }]);
        setIsLoading(true);
        setErrorMsg(null);
        setProducts([]);
        setEmotion('thinking');
        setAnimation('idle');
        setAnimationNonce((value) => value + 1);

        const ws = await waitForSocket();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text, interrupt: true }));
            setInputValue('');
            return;
        }

        try {
            const data = await sendChatMessage(text);
            if (data.text) setMessages((prev) => [...prev, { sender: 'assistant', text: data.text }]);
            if (data.products) setProducts(data.products);
            if (data.emotion) setEmotion(data.emotion);
            applyAvatarBehavior(data.avatar_behavior, data.text || '');
        } catch (error) {
            setErrorMsg("Server bilan aloqa yoq. Backend ishga tushganini tekshiring.");
            setAvatarBehavior(getStateBehavior('error'));
        } finally {
            setIsLoading(false);
            setInputValue('');
        }
    }, [applyAvatarBehavior, isLoading, stopListening, stopAudio, waitForSocket]);

    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    useEffect(() => {
        currentAnimationRef.current = animation;
    }, [animation]);

    useEffect(() => {
        voiceModeRef.current = isVoiceMode;
    }, [isVoiceMode]);

    useEffect(() => {
        localStorage.setItem('avatar_enabled', String(avatarEnabled));
    }, [avatarEnabled]);

    useEffect(() => {
        localStorage.setItem('avatar_lipsync_enabled', String(lipSyncEnabled));
    }, [lipSyncEnabled]);

    const handleTextSubmit = (event) => {
        event.preventDefault();
        voiceModeRef.current = false;
        setIsVoiceMode(false);
        handleSend(inputValue);
    };

    const toggleMic = () => {
        if (isVoiceMode || isListening) {
            voiceModeRef.current = false;
            setIsVoiceMode(false);
            stopListening();
            setInputValue('');
        } else {
            voiceModeRef.current = true;
            setIsVoiceMode(true);
            stopAudio();
            setIsSpeaking(false);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ interrupt: true }));
            }
            startListening();
        }
    };

    return (
        <div className="chat-box">
            <div className="chat-main">
                <div className={`avatar-area ${avatarEnabled ? '' : 'avatar-area-disabled'}`}>
                    <div className="avatar-toolbar">
                        <button type="button" onClick={() => setAvatarEnabled((value) => !value)}>
                            {avatarEnabled ? 'Avatar off' : 'Avatar on'}
                        </button>
                        <button type="button" onClick={() => setLipSyncEnabled((value) => !value)} disabled={!avatarEnabled}>
                            {lipSyncEnabled ? 'Lip off' : 'Lip on'}
                        </button>
                    </div>
                    {avatarEnabled ? (
                        <div className="avatar-canvas-wrapper">
                            <AvatarScene
                                emotion={emotion}
                                animation={animation}
                                animationNonce={animationNonce}
                                isSpeaking={isSpeaking}
                                behaviorCommands={behaviorCommands}
                                lipSyncLevel={lipSyncLevel}
                                lipSyncEnabled={lipSyncEnabled}
                            />
                        </div>
                    ) : (
                        <div className="avatar-disabled-placeholder" />
                    )}
                    {import.meta.env.DEV && avatarEnabled && (
                        <div className="avatar-dev-panel">
                            {[
                                ['Idle', getStateBehavior('idle')],
                                ['Thinking', getStateBehavior('thinking')],
                                ['Speaking', getStateBehavior('speaking')],
                                ['Happy', getStateBehavior('happy')],
                                ['Confused', getStateBehavior('confused')],
                                ['Explain', { state: 'speaking', emotion: 'neutral', gesture: 'explain', intensity: 0.7 }],
                                ['Recommend', { state: 'speaking', emotion: 'happy', gesture: 'recommend', intensity: 0.75 }],
                            ].map(([label, behavior]) => (
                                <button key={label} type="button" onClick={() => applyAvatarBehavior(behavior)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={`voice-status ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                        {isSpeaking ? 'Gapirmoqda...' : isListening ? 'Eshitmoqda...' : ''}
                    </div>
                </div>

                <div className="sidebar-products">
                    <ProductGrid products={products} />
                </div>
            </div>

            <div className="chat-sidebar">
                <div className="messages-container" style={{ flex: 1, overflowY: 'auto' }}>
                    <MessageList messages={messages} isLoading={isLoading} />
                </div>

                {partialText && (
                    <div className="partial-transcript">
                        <span>{partialText}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="error-message">{errorMsg}</div>
                )}

                <div className="quick-buttons">
                    {QUICK_BUTTONS.map((btn, index) => (
                        <button
                            key={index}
                            className="btn-quick"
                            onClick={() => {
                                voiceModeRef.current = false;
                                setIsVoiceMode(false);
                                handleSend(btn.text);
                            }}
                            disabled={isLoading || isSpeaking}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <form className="input-form" onSubmit={handleTextSubmit}>
                    {isSupported && (
                        <button
                            type="button"
                            id="mic-button"
                            className={`btn-mic ${isListening || isVoiceMode ? 'recording' : ''}`}
                            onClick={toggleMic}
                            disabled={isLoading && !isVoiceMode}
                            aria-label={isListening ? 'Mikrofonni toxtatish' : 'Mikrofonni yoqish'}
                            title={isListening ? 'Toxtatish' : 'Ovoz yozish'}
                        >
                            <span aria-hidden="true" className="mic-dot" />
                        </button>
                    )}
                    <input
                        type="text"
                        id="chat-text-input"
                        className="chat-input"
                        placeholder={isListening ? 'Gapiring...' : 'Yozing yoki mikrofondan foydalaning...'}
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        disabled={isLoading || isListening}
                    />
                    <button
                        type="submit"
                        id="send-button"
                        className="btn-send"
                        disabled={isLoading || isListening || !inputValue.trim()}
                    >
                        Yuborish
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatBox;

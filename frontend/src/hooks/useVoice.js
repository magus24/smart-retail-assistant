import { useEffect, useRef, useCallback, useState } from 'react';

const LANGUAGES = ['uz-UZ', 'ru-RU', 'en-US'];

export function useVoice({ onFinalTranscript, onPartialTranscript }) {
    const [isListening, setIsListening] = useState(false);
    const [partialText, setPartialText] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const [lipSyncLevel, setLipSyncLevel] = useState(0);

    const recognitionRef = useRef(null);
    const shouldRestartRef = useRef(false);
    const restartTimerRef = useRef(null);
    const isListeningRef = useRef(false);

    // Web Audio API state
    const audioCtxRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const sourceNodesRef = useRef([]);
    const audioSampleRateRef = useRef(24000);
    const analyserRef = useRef(null);
    const lipSyncRafRef = useRef(null);

    // ── Init SpeechRecognition ──────────────────────────────────────
    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('SpeechRecognition is not supported in this browser.');
            setIsSupported(false);
            return;
        }

        setIsSupported(true);

        const recognition = new SpeechRecognition();
        recognition.lang = LANGUAGES[0]; // uz-UZ primary
        recognition.interimResults = true;  // show partial results
        recognition.continuous = false;     // restarts manually for reliability
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
        };
        recognition.onend = () => {
            isListeningRef.current = false;
            setIsListening(false);
            setPartialText('');

            if (shouldRestartRef.current) {
                restartTimerRef.current = window.setTimeout(() => {
                    restartTimerRef.current = null;
                    if (!shouldRestartRef.current || isListeningRef.current) return;
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('SpeechRecognition restart error:', error);
                    }
                }, 200);
            }
        };

        recognition.onresult = (event) => {
            let interim = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (interim) {
                setPartialText(interim);
                if (onPartialTranscript) onPartialTranscript(interim);
            }

            if (finalText.trim()) {
                setPartialText('');
                if (onFinalTranscript) onFinalTranscript(finalText.trim());
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            console.error('SpeechRecognition error:', event.error);
            isListeningRef.current = false;
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            shouldRestartRef.current = false;
            if (restartTimerRef.current) {
                window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
            recognition.abort();
        };
    }, [onFinalTranscript, onPartialTranscript]);

    // ── Start listening ─────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListeningRef.current) return;
        shouldRestartRef.current = true;
        if (restartTimerRef.current) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }

        try {
            recognitionRef.current.start();
        } catch (error) {
            console.error('SpeechRecognition start error:', error);
        }
    }, []);

    // ── Stop listening ──────────────────────────────────────────────
    const stopListening = useCallback(() => {
        shouldRestartRef.current = false;
        if (restartTimerRef.current) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        try {
            recognitionRef.current?.abort();
        } catch (error) {
            console.error('SpeechRecognition stop error:', error);
        }
        isListeningRef.current = false;
        setIsListening(false);
        setPartialText('');
    }, []);

    // ── Init Web Audio API ──────────────────────────────────────────
    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            nextPlayTimeRef.current = audioCtxRef.current.currentTime;
        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        if (!analyserRef.current && audioCtxRef.current) {
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.45;
            analyserRef.current.connect(audioCtxRef.current.destination);
        }
    }, []);

    const startLipSyncMeter = useCallback(() => {
        if (lipSyncRafRef.current || !analyserRef.current) return;

        const data = new Uint8Array(analyserRef.current.fftSize);
        let lastUpdate = 0;
        const tick = (time) => {
            if (!analyserRef.current) {
                lipSyncRafRef.current = null;
                return;
            }

            if (time - lastUpdate > 33) {
                analyserRef.current.getByteTimeDomainData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                    const centered = (data[i] - 128) / 128;
                    sum += centered * centered;
                }
                setLipSyncLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
                lastUpdate = time;
            }

            if (sourceNodesRef.current.length > 0) {
                lipSyncRafRef.current = window.requestAnimationFrame(tick);
            } else {
                setLipSyncLevel(0);
                lipSyncRafRef.current = null;
            }
        };

        lipSyncRafRef.current = window.requestAnimationFrame(tick);
    }, []);

    // ── Play PCM Audio Chunk ────────────────────────────────────────
    const setAudioSampleRate = useCallback((sampleRate) => {
        const parsedSampleRate = Number(sampleRate);
        if (Number.isFinite(parsedSampleRate) && parsedSampleRate > 0) {
            audioSampleRateRef.current = parsedSampleRate;
        }
    }, []);

    const playAudioChunk = useCallback((arrayBuffer) => {
        initAudioContext();
        const audioCtx = audioCtxRef.current;
        
        // Backend streams raw 16-bit mono PCM and announces the sample rate.
        const sampleRate = audioSampleRateRef.current;
        const int16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(int16.length);
        
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        const buffer = audioCtx.createBuffer(1, float32.length, sampleRate);
        buffer.getChannelData(0).set(float32);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyserRef.current || audioCtx.destination);
        
        // Prevent buffer underrun gaps by adding a tiny delay or trusting the stream
        const currentTime = audioCtx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime + 0.1; // 100ms buffering
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;
        
        sourceNodesRef.current.push(source);
        startLipSyncMeter();
        
        source.onended = () => {
            sourceNodesRef.current = sourceNodesRef.current.filter(s => s !== source);
        };
    }, [initAudioContext, startLipSyncMeter]);

    // ── Stop Audio ──────────────────────────────────────────────────
    const stopAudio = useCallback(() => {
        sourceNodesRef.current.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        sourceNodesRef.current = [];
        if (lipSyncRafRef.current) {
            window.cancelAnimationFrame(lipSyncRafRef.current);
            lipSyncRafRef.current = null;
        }
        setLipSyncLevel(0);
        if (audioCtxRef.current) {
            nextPlayTimeRef.current = audioCtxRef.current.currentTime;
        }
    }, []);

    const waitForAudioCompletion = useCallback((onComplete) => {
        if (!audioCtxRef.current || sourceNodesRef.current.length === 0) {
            onComplete();
            return;
        }
        const timeRemaining = Math.max(0, nextPlayTimeRef.current - audioCtxRef.current.currentTime);
        setTimeout(() => {
            onComplete();
        }, timeRemaining * 1000 + 100); // 100ms padding
    }, []);

    return {
        isListening,
        partialText,
        isSupported,
        lipSyncLevel,
        startListening,
        stopListening,
        setAudioSampleRate,
        playAudioChunk,
        stopAudio,
        waitForAudioCompletion,
    };
}

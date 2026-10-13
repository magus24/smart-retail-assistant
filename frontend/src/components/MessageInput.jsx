import React, { useRef, useState } from 'react';

const quickButtons = [
    'Menga yegulik tavsiya qiling',
    'Nima ichsam boladi?',
    'Shirin narsa korsating',
    'Foydali variant tavsiya qiling'
];

const MessageInput = ({ onSendMessage, onSendVoice, isLoading }) => {
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (inputValue.trim() && !isLoading) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach((track) => track.stop());
                onSendVoice?.(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Mikrofonga ulanish xatosi:', error);
            alert('Mikrofonga ruxsat olib bolmadi.');
        }
    };

    return (
        <div className="input-area">
            <div className="quick-buttons">
                {quickButtons.map((btnTxt, index) => (
                    <button
                        key={index}
                        className="btn-quick"
                        onClick={() => onSendMessage(btnTxt)}
                        disabled={isLoading || isRecording}
                    >
                        {btnTxt}
                    </button>
                ))}
            </div>
            <form className="input-form" onSubmit={handleSubmit}>
                <button
                    type="button"
                    className={`btn-mic ${isRecording ? 'recording' : ''}`}
                    onClick={toggleRecording}
                    disabled={isLoading}
                    title="Ovozli kiritish"
                    aria-label={isRecording ? 'Mikrofonni toxtatish' : 'Mikrofonni yoqish'}
                >
                    <span aria-hidden="true" className="mic-dot" />
                </button>
                <input
                    type="text"
                    className="chat-input"
                    placeholder={isRecording ? 'Ovoz yozilmoqda...' : 'Savolingizni shu yerga yozing...'}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    disabled={isLoading || isRecording}
                />
                <button type="submit" className="btn-send" disabled={isLoading || isRecording || !inputValue.trim()}>
                    Yuborish
                </button>
            </form>
        </div>
    );
};

export default MessageInput;

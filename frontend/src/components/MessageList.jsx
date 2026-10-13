import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, isLoading }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="message-list-container">
            {messages.length === 0 ? (
                null
            ) : (
                messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.sender}`}>
                        <div className="message-bubble">{msg.text}</div>
                    </div>
                ))
            )}
            {isLoading && (
                <div className="message-wrapper assistant">
                    <div className="message-bubble typing-indicator">
                        Assistent javob tayyorlamoqda <span className="dot-flashing">...</span>
                    </div>
                </div>
            )}
            <div ref={endRef} />
        </div>
    );
};

export default MessageList;

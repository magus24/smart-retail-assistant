import React from 'react';
import { AvatarSelector } from '../avatar/AvatarSelector';

const Header = () => {
    return (
        <header className="header">
            <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Yasi Assistent</h1>
                <AvatarSelector />
            </div>
            <p style={{ textAlign: 'left', marginTop: '0' }}>Sizning AI yordamchingiz</p>
        </header>
    );
};

export default Header;

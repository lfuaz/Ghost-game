import React, { useState, useEffect, useRef } from 'react';

const NameModal = ({ onSaveName, isOpen }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // Focus the input when the modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate name
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }

        if (name.trim().length > 15) {
            setError('Name must be at most 15 characters');
            return;
        }

        // Save name and close modal
        onSaveName(name.trim());
    };

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: isOpen ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                padding: '30px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                animation: isOpen ? 'fadeIn 0.3s ease-out' : 'none'
            }}>
                <h2 style={{ color: '#e91e63', marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                    Welcome to Ghost Game
                </h2>

                <p style={{ color: '#b0b0b0', marginBottom: '20px', textAlign: 'center' }}>
                    Please enter your name to continue
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Your name"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '4px',
                            border: `1px solid ${error ? '#f44336' : '#7b1fa2'}`,
                            backgroundColor: '#121212',
                            color: 'white',
                            fontSize: '16px',
                            boxSizing: 'border-box',
                            marginBottom: error ? '5px' : '20px'
                        }}
                        maxLength="15"
                    />

                    {error && (
                        <p style={{ color: '#f44336', margin: '5px 0 20px', fontSize: '14px' }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#7b1fa2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#673ab7'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7b1fa2'}
                    >
                        Start Playing
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NameModal;

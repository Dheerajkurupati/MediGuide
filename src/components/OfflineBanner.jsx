import { useState, useEffect } from 'react';
import './OfflineBanner.css';

const OfflineBanner = () => {
    const [status, setStatus] = useState('online'); // 'online' | 'offline' | 'back'

    useEffect(() => {
        const handleOffline = () => setStatus('offline');
        const handleOnline = () => {
            setStatus('back');
            // Show "back online" briefly then hide
            setTimeout(() => setStatus('online'), 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Check immediately on mount
        if (!navigator.onLine) setStatus('offline');

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (status === 'online') return null;

    return (
        <div className={`offline-banner ${status}`}>
            {status === 'offline' ? (
                <>
                    <span className="banner-icon">⚠️</span>
                    <span>No internet connection — some features may not work until you reconnect.</span>
                </>
            ) : (
                <>
                    <span className="banner-icon">✓</span>
                    <span>Back online — everything is working normally.</span>
                </>
            )}
        </div>
    );
};

export default OfflineBanner;

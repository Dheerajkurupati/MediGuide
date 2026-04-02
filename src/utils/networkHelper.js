// ─────────────────────────────────────────────────────────────
// networkHelper.js — Network & Supabase error handling utilities
// ─────────────────────────────────────────────────────────────

// Check if browser reports online
export const isOnline = () => navigator.onLine;

// Detect if a Supabase/fetch error is a network/connectivity issue
export const isNetworkError = (error) => {
    if (!navigator.onLine) return true;
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('networkerror') ||
        msg.includes('fetch') ||
        msg.includes('timeout') ||
        msg.includes('econnrefused') ||
        msg.includes('connection') ||
        msg.includes('offline')
    );
};

// Standard error messages — call this inside any catch block
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    if (!navigator.onLine || isNetworkError(error)) {
        return 'No internet connection. Please check your network and try again.';
    }
    if (!error) return fallback;
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('timeout')) return 'Request timed out. Please try again.';
    if (msg.includes('jwt') || msg.includes('auth')) return 'Session expired. Please login again.';
    return fallback;
};

// Wraps any async Supabase call with consistent network error handling
// Usage: const result = await safeRequest(() => supabase.from('...').select(), 'fallback error')
export const safeRequest = async (fn, fallbackMessage = 'Connection failed. Please try again.') => {
    if (!navigator.onLine) {
        return { data: null, error: { message: 'No internet connection. Please check your network.' } };
    }
    try {
        const result = await fn();
        if (result.error && isNetworkError(result.error)) {
            return { data: null, error: { message: 'Could not reach the server. Please check your connection.' } };
        }
        return result;
    } catch (err) {
        return {
            data: null,
            error: { message: isNetworkError(err) ? 'No internet connection. Please check your network.' : fallbackMessage }
        };
    }
};

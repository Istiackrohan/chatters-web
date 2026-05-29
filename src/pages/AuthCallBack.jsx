import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('Completing sign in...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;
                if (session) {
                    navigate('/', { replace: true });
                } else {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const errorDesc = hashParams.get('error_description');
                    if (errorDesc) throw new Error(errorDesc);
                    setError('Unable to complete sign in. Please try again.');
                    navigate('/login', { replace: true });
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                setError(err.message || 'Authentication failed');
                navigate('/login', { replace: true });
            }
        };
        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Error</h3>
                        <p className="text-sm text-gray-600 mb-4">{error}</p>
                        <p className="text-xs text-gray-500">Redirecting to login page...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{message}</p>
            </div>
        </div>
    );
}

export default AuthCallback;
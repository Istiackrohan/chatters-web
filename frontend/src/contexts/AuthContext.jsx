import { useEffect, useState } from 'react';
import authService from '../services/auth';
import { AuthContext } from './AuthContextValue';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        let cancelled = false;

        // Check current session on mount
        authService.getCurrentUser()
            .then(({ success, user }) => {
                if (!cancelled && success) {
                    setUser(user);
                }
            })
            .catch((error) => {
                console.error('Error checking user:', error);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user || null);
            setLoading(false);
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        const result = await authService.signInWithGoogle();
        if (result.success && result.url) {
            window.location.href = result.url;
        }
        return result;
    };

    const signInWithGitHub = async () => {
        const result = await authService.signInWithGitHub();
        if (result.success && result.url) {
            window.location.href = result.url;
        }
        return result;
    };

    const signIn = async (email, password) => {
        return await authService.signIn(email, password);
    };

    const signUp = async (email, password, fullName) => {
        const result = await authService.signUp(email, password, fullName);
        if (result.success && result.session) {
            // Immediately set the user and session in context
            setUser(result.user);
            setSession(result.session);
        }
        return result;
    };

    const signOut = async () => {
        const result = await authService.signOut();
        if (result.success) {
            setUser(null);
            setSession(null);
        }
        return result;
    };

    const resetPassword = async (email) => {
        return await authService.resetPassword(email);
    };

    const updatePassword = async (newPassword) => {
        return await authService.updatePassword(newPassword);
    };

    const value = {
        user,
        session,
        loading,
        signInWithGoogle,
        signInWithGitHub,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,   
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

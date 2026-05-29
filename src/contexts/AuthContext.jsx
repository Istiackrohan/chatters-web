import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/auth';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        // Check current session on mount
        checkUser();

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            setSession(session);
            setUser(session?.user || null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        try {
            const { success, user } = await authService.getCurrentUser();
            if (success) {
                setUser(user);
            }
        } catch (error) {
            console.error('Error checking user:', error);
        } finally {
            setLoading(false);
        }
    };

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
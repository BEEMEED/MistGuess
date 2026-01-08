import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const code = searchParams.get('code');

    if (code) {
      handleGoogleCallback(code)
        .then(() => {
          // Redirect to home page after successful login
          navigate('/', { replace: true });
        })
        .catch((error) => {
          console.error('Google callback error:', error);
          // Redirect to home page with error
          navigate('/?error=google_auth_failed', { replace: true });
        });
    } else {
      // No code, redirect back to home
      navigate('/', { replace: true });
    }
  }, []);

  return (
    <div className="full-screen flex-center">
      <div className="mistborn-spinner"></div>
      <p style={{ color: 'var(--metal-copper)', marginTop: '20px' }}>
        Completing Google sign-in...
      </p>
    </div>
  );
};

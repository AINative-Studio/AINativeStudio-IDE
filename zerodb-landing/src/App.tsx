import { useState } from 'react';
import { LoginForm, SignUpForm, AuthLayout } from './components/auth';

/**
 * Demo application showcasing authentication forms
 * Toggle between login and signup views
 */
function App() {
  const [isLoginView, setIsLoginView] = useState(true);

  const handleLoginSuccess = () => {
    console.log('Login successful! Redirecting to dashboard...');
    // In production, this would redirect to the authenticated area
    alert('Login successful! You would now be redirected to the dashboard.');
  };

  const handleSignUpSuccess = () => {
    console.log('Sign up successful! Redirecting to dashboard...');
    // In production, this would redirect to the authenticated area
    alert('Registration successful! You would now be redirected to the dashboard.');
  };

  return (
    <AuthLayout>
      {isLoginView ? (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onSignUpClick={() => setIsLoginView(false)}
        />
      ) : (
        <SignUpForm
          onSuccess={handleSignUpSuccess}
          onLoginClick={() => setIsLoginView(true)}
        />
      )}
    </AuthLayout>
  );
}

export default App;

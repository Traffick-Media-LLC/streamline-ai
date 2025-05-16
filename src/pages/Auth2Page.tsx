
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmailAuth } from '@/hooks/use-email-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { logEvent, logError, generateRequestId } from '@/utils/logging';
import { toast } from '@/components/ui/sonner';

interface LocationState {
  from?: string;
}

const Auth2Page = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, isAuthenticated, loading } = useEmailAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const from = state?.from || '/';

  const requestId = generateRequestId();

  useEffect(() => {
    // Log page view
    logEvent({
      requestId,
      userId: null,
      eventType: 'auth_page_view',
      component: 'Auth2Page',
      message: `Auth page viewed. Mode: ${authMode}`
    });

    // Redirect if already authenticated
    if (isAuthenticated) {
      logEvent({
        requestId,
        userId: null,
        eventType: 'auth_redirect',
        component: 'Auth2Page',
        message: `Redirecting already authenticated user to: ${from}`
      });
      navigate(from);
    }
  }, [isAuthenticated, navigate, from, authMode, requestId]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    try {
      logEvent({
        requestId,
        userId: null,
        eventType: 'signin_attempt',
        component: 'Auth2Page',
        message: 'Sign in attempt initiated'
      });

      const result = await signIn(email, password);
      
      if (!result.success) {
        setAuthError(result.message || 'Failed to sign in');
        return;
      }
      
      toast.success('Signed in successfully');
      
      // Navigate happens automatically via the useEffect when isAuthenticated changes
    } catch (error: any) {
      logError(
        requestId,
        'Auth2Page',
        'Sign in error',
        error
      );
      setAuthError(error.message || 'An unexpected error occurred');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }
    
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    try {
      logEvent({
        requestId,
        userId: null,
        eventType: 'signup_attempt',
        component: 'Auth2Page',
        message: 'Sign up attempt initiated'
      });

      const result = await signUp(email, password);
      
      if (!result.success) {
        setAuthError(result.message || 'Failed to sign up');
        return;
      }
      
      toast.success(result.message || 'Account created successfully');
      
      // If user was auto-confirmed (no email verification required)
      if (result.session) {
        // Navigate happens automatically via the useEffect when isAuthenticated changes
      } else {
        // User needs to verify email, so we stay on the auth page but switch to sign in
        setAuthMode('signin');
      }
    } catch (error: any) {
      logError(
        requestId,
        'Auth2Page',
        'Sign up error',
        error
      );
      setAuthError(error.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          
          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            {authError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="mt-2"
                    onClick={() => {
                      logEvent({
                        requestId,
                        userId: null,
                        eventType: 'switch_to_signup',
                        component: 'Auth2Page',
                        message: 'User switched to signup form'
                      });
                      setAuthMode('signup');
                    }}
                  >
                    Don't have an account? Sign Up
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing Up...' : 'Sign Up'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="mt-2"
                    onClick={() => {
                      logEvent({
                        requestId,
                        userId: null,
                        eventType: 'switch_to_signin',
                        component: 'Auth2Page',
                        message: 'User switched to signin form'
                      });
                      setAuthMode('signin');
                    }}
                  >
                    Already have an account? Sign In
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth2Page;

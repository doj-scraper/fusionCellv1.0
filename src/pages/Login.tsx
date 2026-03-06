import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'sign-up' && password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both password fields match before creating your account.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const needsEmailVerification = !data.session;
      toast({
        title: needsEmailVerification ? 'Check your email' : 'Account created',
        description: needsEmailVerification
          ? 'We sent a confirmation link to your inbox. Verify your email to complete sign up.'
          : 'Your account is ready and you are now signed in.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            {mode === 'sign-in' ? 'Sign in to the admin dashboard' : 'Create an admin account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
            <Button
              type="button"
              variant={mode === 'sign-in' ? 'default' : 'ghost'}
              onClick={() => setMode('sign-in')}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={mode === 'sign-up' ? 'default' : 'ghost'}
              onClick={() => setMode('sign-up')}
            >
              Sign Up
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
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
                minLength={6}
              />
            </div>
            {mode === 'sign-up' && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

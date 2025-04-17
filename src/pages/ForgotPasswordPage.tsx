
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(data.email);
      setIsSubmitted(true);
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions",
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-shield-dark p-4">
      <div className="mb-8 flex flex-col items-center">
        <Shield className="h-12 w-12 text-shield-primary mb-4" />
        <h1 className="text-3xl font-bold text-center">
          CodeShield<span className="text-shield-primary">AI</span>
        </h1>
      </div>
      
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Forgot your password?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email address and we'll send you a reset link
                </p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                  <Mail className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="bg-shield-low/10 text-shield-low p-3 rounded-md mb-4">
                <Mail className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-medium">Check your email</h3>
                <p className="text-sm mt-1">We've sent a password reset link to your email address</p>
              </div>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setIsSubmitted(false)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try a different email
              </Button>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Remember your password?</span>{" "}
            <Link to="/login" className="text-shield-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;

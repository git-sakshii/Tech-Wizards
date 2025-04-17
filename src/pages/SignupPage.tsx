
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [formData, setFormData] = useState<SignupFormValues | null>(null);
  const [otp, setOtp] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });
  const { register: registerUser, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmitSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      await registerUser(data.name, data.email, data.password);
      setFormData(data);
      setStep('otp');
      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code",
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error instanceof Error ? error.message : "An error occurred during signup",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitOtp = async () => {
    if (!formData) return;
    
    setIsLoading(true);
    try {
      await verifyOtp(formData.email, otp);
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      });
      navigate('/login');
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
      });
    } finally {
      setIsLoading(false);
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
          {step === 'signup' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Create an account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign up to start securing your code
                </p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmitSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      {...register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account?</span>{" "}
                <Link to="/login" className="text-shield-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Verify your email</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We've sent a 6-digit code to {formData?.email}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                
                <Button 
                  onClick={onSubmitOtp} 
                  className="w-full" 
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  Didn't receive a code?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-shield-primary" 
                    onClick={() => {
                      // This would trigger a resend OTP function
                      toast({
                        title: "Code resent",
                        description: "Please check your email for the new verification code",
                      });
                    }}
                  >
                    Resend
                  </Button>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;

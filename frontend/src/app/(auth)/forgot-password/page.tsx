'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { apiClient } from '@/lib/api/client'
import { Mail, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await apiClient.post('/auth/forgot-password', { email })
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-sky-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sky-400/10 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-sky-400 rounded-xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  AI Course Creator
                </h1>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
                <div className="text-center" data-testid="success-message">
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-emerald-500/10 rounded-full">
                      <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
                  <p className="text-gray-300 mb-6">
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Check your inbox and follow the instructions to reset your password.
                  </p>
                  
                  <div className="space-y-4">
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white font-semibold"
                    >
                      <Link href="/login">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Link>
                    </Button>
                    
                    <p className="text-sm text-gray-400">
                      Didn't receive the email? Check your spam folder or{' '}
                      <button 
                        onClick={() => setIsSuccess(false)}
                        className="text-sky-400 hover:text-sky-300 font-medium"
                      >
                        try again
                      </button>
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-sky-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sky-400/10 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-sky-400 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AI Course Creator
              </h1>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Forgot Your Password?</h2>
            <p className="text-gray-300">
              No worries! Enter your email and we'll send you a reset link.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="forgot-password-form">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="email" className="text-gray-200 font-medium">Email Address</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      data-testid="email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-sky-400 focus:ring-sky-400/20"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    We'll send a password reset link to this email
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="send-reset-button"
                  className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Reset Link...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mt-8"
          >
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link href="/register" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
                Sign up here
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
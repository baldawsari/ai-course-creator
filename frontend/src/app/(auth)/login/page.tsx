'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store/auth-store'
import { apiClient } from '@/lib/api/client'
import { Eye, EyeOff, Mail, Lock, BookOpen, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const router = useRouter()
  const { login } = useAuthStore()

  const validateForm = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')
    
    if (!email) {
      setEmailError('Email is required')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email address')
      isValid = false
    }
    
    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      isValid = false
    }
    
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      }) as { user: any, token: string }
      
      login(response.user, response.token)
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      }
      
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const benefits = [
    {
      icon: BookOpen,
      title: "Generate Courses Instantly",
      description: "Transform your documents into comprehensive courses with AI"
    },
    {
      icon: Zap,
      title: "Save Hours of Work",
      description: "What takes days now takes minutes with intelligent automation"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your content is protected with bank-level security measures"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden" data-testid="mobile-auth-layout">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Benefits */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex lg:flex-1 flex-col justify-center px-16 text-white"
        >
          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="p-3 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-xl" data-testid="app-logo">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AI Course Creator
              </h1>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-4xl font-bold mb-6 leading-tight"
            >
              Transform Your Content Into 
              <span className="bg-gradient-to-r from-purple-500 to-amber-500 bg-clip-text text-transparent"> Interactive Courses</span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="text-xl text-gray-300 mb-12"
            >
              Empower your teaching with AI-driven course generation that creates engaging, professional learning experiences in minutes.
            </motion.p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.2, duration: 0.5 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
                >
                  <div className="p-2 bg-gradient-to-r from-purple-500/20 to-cyan-400/20 rounded-lg">
                    <benefit.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-gray-300 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex items-center justify-center px-8 py-12"
        >
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-300">
                Don't have an account?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-400/80 font-medium transition-colors">
                  Sign up here
                </Link>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl shadow-purple-500/10" data-testid="login-form mobile-login-form">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm"
                      data-testid="login-error"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-200 font-medium">Email Address</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => {
                            if (!email) setEmailError('Email is required')
                            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setEmailError('Invalid email address')
                            else setEmailError('')
                          }}
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20"
                          placeholder="Enter your email"
                          data-testid="email-input"
                        />
                      </div>
                      {emailError && (
                        <p className="mt-1 text-sm text-red-400" data-testid="email-error">
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-gray-200 font-medium">Password</Label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => {
                            if (!password) setPasswordError('Password is required')
                            else if (password.length < 8) setPasswordError('Password must be at least 8 characters')
                            else setPasswordError('')
                          }}
                          className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20"
                          placeholder="Enter your password"
                          data-testid="password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="mt-1 text-sm text-red-400" data-testid="password-error">
                          {passwordError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-cyan-400 focus:ring-cyan-400/20 border-white/20 rounded bg-white/5"
                        data-testid="remember-me-checkbox"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                        Remember me
                      </label>
                    </div>

                    <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-400/80 font-medium transition-colors" data-testid="forgot-password-link">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 group relative overflow-hidden light-burst before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-500 before:animate-pulse"
                    disabled={isLoading}
                    data-testid="login-button"
                  >
                    {isLoading ? (
                      <div className="relative z-10 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="relative z-10 flex items-center gap-2">
                        Sign in to Dashboard
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-transparent text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 transition-all duration-300"
                    onClick={() => {}}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Magic Link (Coming Soon)
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
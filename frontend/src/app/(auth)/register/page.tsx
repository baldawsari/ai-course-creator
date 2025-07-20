'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store/auth-store'
import { apiClient } from '@/lib/api/client'
import { 
  User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, 
  Building, GraduationCap, Users, BookOpen, Zap, Star, Sparkles 
} from 'lucide-react'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  organization: string
  role: string
  useCase: string
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: '',
    useCase: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const router = useRouter()
  const { login } = useAuthStore()

  const totalSteps = 3

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Please enter your full name')
          return false
        }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
          setError('Please enter a valid email address')
          return false
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          return false
        }
        return true
      case 2:
        if (!formData.organization.trim()) {
          setError('Please enter your organization')
          return false
        }
        if (!formData.role) {
          setError('Please select your role')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('')
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organization: formData.organization,
        role: formData.role,
        useCase: formData.useCase
      }) as { user: any, token: string }
      
      login(response.user, response.token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  const roles = [
    { id: 'instructor', name: 'Instructor/Teacher', icon: GraduationCap },
    { id: 'trainer', name: 'Corporate Trainer', icon: Users },
    { id: 'manager', name: 'Training Manager', icon: Building },
    { id: 'consultant', name: 'Educational Consultant', icon: BookOpen }
  ]

  const useCases = [
    { id: 'corporate', name: 'Corporate Training', description: 'Employee skill development and onboarding' },
    { id: 'academic', name: 'Academic Courses', description: 'University and school curriculum' },
    { id: 'certification', name: 'Certification Programs', description: 'Professional certifications and compliance' },
    { id: 'personal', name: 'Personal Development', description: 'Self-paced learning and skill building' }
  ]

  const renderProgressBar = () => (
    <div className="w-full max-w-md mx-auto mb-8" data-testid="step-indicator mobile-step-indicator">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div 
            key={i} 
            className={`flex items-center ${i + 1 === currentStep ? 'active' : ''}`} 
            data-testid={`step-${i + 1}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              i + 1 <= currentStep
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] text-white shadow-lg shadow-purple-500/25'
                : 'bg-white/10 text-gray-400'
            }`}>
              {i + 1 < currentStep ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                i + 1 < currentStep ? 'bg-gradient-to-r from-[#7C3AED] to-[#F59E0B]' : 'bg-white/10'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-300">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
        <p className="text-gray-300">Let's start with your basic information</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-gray-200 font-medium">Full Name</Label>
          <div className="relative mt-2">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="name"
              type="text"
              data-testid="name-input"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-[#06B6D4] focus:ring-[#06B6D4]/20"
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-gray-200 font-medium">Email Address</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="email"
              type="email"
              data-testid="email-input"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-[#06B6D4] focus:ring-[#06B6D4]/20"
              placeholder="Enter your email address"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="text-gray-200 font-medium">Password</Label>
          <div className="relative mt-2">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              data-testid="password-input"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-accent focus:ring-accent/20"
              placeholder="Create a secure password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-gray-200 font-medium">Confirm Password</Label>
          <div className="relative mt-2">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              data-testid="confirm-password-input"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-accent focus:ring-accent/20"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Tell Us About Yourself</h2>
        <p className="text-gray-300">This helps us personalize your experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="organization" className="text-gray-200 font-medium">Organization</Label>
          <div className="relative mt-2">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="organization"
              type="text"
              data-testid="organization-input"
              value={formData.organization}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-[#06B6D4] focus:ring-[#06B6D4]/20"
              placeholder="Your school, company, or organization"
              required
            />
          </div>
        </div>

        <div>
          <Label className="text-gray-200 font-medium mb-3 block">What's your role?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                data-testid={`role-${role.id}`}
                onClick={() => handleInputChange('role', role.id)}
                className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                  formData.role === role.id
                    ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/10 to-[#F59E0B]/5 text-white shadow-lg shadow-purple-500/10'
                    : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-[#7C3AED]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <role.icon className="w-5 h-5" />
                  <span className="font-medium">{role.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">How will you use AI Course Creator?</h2>
        <p className="text-gray-300">Select your primary use case (you can change this later)</p>
      </div>

      <div className="space-y-3">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            type="button"
            data-testid={`usecase-${useCase.id}`}
            onClick={() => handleInputChange('useCase', useCase.id)}
            className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
              formData.useCase === useCase.id
                ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/10 to-[#F59E0B]/5 text-white shadow-lg shadow-purple-500/10'
                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-[#7C3AED]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                formData.useCase === useCase.id ? 'border-[#7C3AED] bg-[#7C3AED]' : 'border-white/20'
              }`}>
                {formData.useCase === useCase.id && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <h3 className="font-medium mb-1">{useCase.name}</h3>
                <p className="text-sm text-gray-400">{useCase.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-r from-[#7C3AED]/10 to-[#F59E0B]/10 border border-[#7C3AED]/20 rounded-lg p-4 mt-6 shadow-lg shadow-purple-500/5">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-[#7C3AED] mt-0.5" />
          <div>
            <h3 className="font-medium text-white mb-1">Welcome Tutorial</h3>
            <p className="text-sm text-gray-300">
              After registration, you'll get a guided tour of AI Course Creator's powerful features.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[#7C3AED]/20 to-[#F59E0B]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-[#06B6D4]/10 to-[#F59E0B]/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-gradient-to-r from-[#7C3AED]/15 to-[#10B981]/15 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          {/* Logo Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] rounded-xl shadow-lg shadow-purple-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AI Course Creator
              </h1>
            </div>
            <p className="text-gray-300">
              Already have an account?{' '}
              <Link href="/login" className="text-[#06B6D4] hover:text-[#06B6D4]/80 font-medium transition-colors">
                Sign in here
              </Link>
            </p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {renderProgressBar()}
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    data-testid="next-step-button mobile-next-button"
                    className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] hover:from-[#7C3AED]/90 hover:to-[#F59E0B]/90 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 relative overflow-hidden group light-burst"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    data-testid="complete-registration-button"
                    className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] hover:from-[#7C3AED]/90 hover:to-[#F59E0B]/90 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 relative overflow-hidden group light-burst"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-center gap-2 relative z-10">
                          <Zap className="w-4 h-4" />
                          Start Building Courses
                        </div>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
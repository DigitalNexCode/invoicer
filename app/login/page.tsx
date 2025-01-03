'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { getSupabase } from '@/lib/supabase-client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Error during login:', error)
    }
  }

  //const resendConfirmationEmail = async () => { //Removed resendConfirmationEmail function
  //  try {
  //    const { error } = await supabase.auth.resend({
  //      type: 'signup',
  //      email: email,
  //    })
  //    if (error) throw error
  //    setError('Confirmation email resent. Please check your inbox.')
  //  } catch (error) {
  //    console.error('Error resending confirmation email:', error)
  //    setError('Failed to resend confirmation email. Please try again.')
  //  }
  //}

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your email and password to log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button className="w-full" type="submit" onClick={handleLogin}>Log in</Button>
          {/* {error && error.includes('confirm your email') && ( //Removed resend confirmation email button
          //   <Button variant="link" className="mt-2" onClick={resendConfirmationEmail}>
          //     Resend confirmation email
          //   </Button>
          // )} */}
          <p className="mt-4 text-sm text-center">
            Don't have an account? <Link href="/signup" className="text-blue-500 hover:underline">Sign up</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}


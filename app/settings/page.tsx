'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabase } from '@/lib/supabase-client'
import { toast } from "@/components/ui/use-toast"

const profileSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  fullName: z.string().min(1, { message: "Full name is required" }),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Please confirm your new password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const settingsSchema = z.object({
  yocoApiKey: z.string().optional(),
  yocoSecretKey: z.string().optional(),
})

interface YocoSettings {
  yoco_public_key: string | null;
  yoco_secret_key: string | null;
  yoco_test_public_key: string | null;
  yoco_test_secret_key: string | null;
}

const yocoSchema = z.object({
  yocoPublicKey: z.string().min(1, { message: "Public key is required" }),
  yocoSecretKey: z.string().min(1, { message: "Secret key is required" }),
  yocoTestPublicKey: z.string().min(1, { message: "Test public key is required" }),
  yocoTestSecretKey: z.string().min(1, { message: "Test secret key is required" }),
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>
type YocoFormData = z.infer<typeof yocoSchema>

interface UserSettings {
  user_id: string;
  yoco_public_key: string;
  yoco_secret_key: string;
  yoco_test_public_key: string;
  yoco_test_secret_key: string;
}

export default function SettingsPage() {
  const [isUpdating, setIsUpdating] = useState(false)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  })

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const supabase = getSupabase()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) throw error
        if (!user) throw new Error('No user found')

        profileForm.reset({
          email: user.email || '',
          fullName: user.user_metadata?.full_name || '',
        })
      } catch (error) {
        console.error('Error loading user profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      }
    }

    loadUserProfile()
  }, [profileForm])

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onUpdateProfile = async (values: ProfileFormData) => {
    setIsUpdating(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.updateUser({
        email: values.email,
        data: { full_name: values.fullName }
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully. Please check your email to confirm any changes.",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const onUpdatePassword = async (values: PasswordFormData) => {
    setIsUpdating(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password updated successfully.",
      })
      passwordForm.reset()
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const onResetPassword = async () => {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        throw new Error('No email found')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings`,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      })
    } catch (error) {
      console.error('Error requesting password reset:', error)
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      })
    }
  }

  const yocoForm = useForm<YocoFormData>({
    resolver: zodResolver(yocoSchema),
    defaultValues: {
      yocoPublicKey: "",
      yocoSecretKey: "",
      yocoTestPublicKey: "",
      yocoTestSecretKey: "",
    },
  })

  useEffect(() => {
    const loadYocoSettings = async () => {
      try {
        const supabase = getSupabase()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error getting user:', userError)
          throw userError
        }
        
        if (!user) {
          const noUserError = new Error('No user found')
          console.error('Error:', noUserError)
          throw noUserError
        }

        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('yoco_public_key, yoco_secret_key, yoco_test_public_key, yoco_test_secret_key')
          .eq('user_id', user.id)
          .single()

        if (settingsError) {
          console.error('Error fetching settings:', settingsError)
          // If no settings found, this is expected for new users
          if (settingsError.code === 'PGRST116') {
            return // No settings yet, form will use default empty values
          }
          throw settingsError
        }
        
        if (settings) {
          const typedSettings = settings as unknown as YocoSettings
          yocoForm.reset({
            yocoPublicKey: typedSettings.yoco_public_key || '',
            yocoSecretKey: typedSettings.yoco_secret_key || '',
            yocoTestPublicKey: typedSettings.yoco_test_public_key || '',
            yocoTestSecretKey: typedSettings.yoco_test_secret_key || '',
          })
        }
      } catch (error) {
        console.error('Error loading Yoco settings:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load Yoco settings",
          variant: "destructive",
        })
      }
    }

    loadYocoSettings()
  }, [yocoForm])

  const updateUserSettings = async (userId: string, yocoKeys: Partial<UserSettings>) => {
    const supabase = getSupabase()
    // Check if a row for this user_id already exists
    const { data: existingRow, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing user settings:', fetchError)
      throw fetchError
    }

    let result

    if (existingRow) {
      // Update the existing row
      const { data, error } = await supabase
        .from('user_settings')
        .update(yocoKeys)
        .eq('user_id', userId)

      result = { data, error }
    } else {
      // Insert a new row
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, ...yocoKeys })

      result = { data, error }
    }

    if (result.error) {
      console.error('Error updating or inserting user settings:', result.error)
      throw result.error
    }

    return result.data
  }

  const onUpdateYoco = async (values: YocoFormData) => {
    setIsUpdating(true)
    try {
      // Validate input data
      if (!values.yocoPublicKey || !values.yocoSecretKey || !values.yocoTestPublicKey || !values.yocoTestSecretKey) {
        throw new Error('All Yoco keys are required')
      }

      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Authentication error:', userError)
        throw new Error(`Authentication failed: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Prepare the update data
      const yocoKeys = {
        yoco_public_key: values.yocoPublicKey,
        yoco_secret_key: values.yocoSecretKey,
        yoco_test_public_key: values.yocoTestPublicKey,
        yoco_test_secret_key: values.yocoTestSecretKey,
      }

      console.log('Attempting to update Yoco settings with:', { 
        ...yocoKeys, 
        yoco_secret_key: '[REDACTED]', 
        yoco_test_secret_key: '[REDACTED]' 
      })

      await updateUserSettings(user.id, yocoKeys)

      console.log('Yoco settings updated successfully')

      toast({
        title: "Success",
        description: "Yoco settings updated successfully.",
      })
    } catch (error) {
      console.error('Error updating Yoco settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to update Yoco settings: ${error.message}` 
          : "Failed to update Yoco settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-8">
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? "Updating..." : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-8">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your current password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? "Updating..." : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}


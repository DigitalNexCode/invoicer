import { getSupabase } from './supabase-client'

const BASE_URL = "https://payments.yoco.com/api"

interface PaymentLinkData {
  amountInCents: number
  currency: string
  description: string
  metadata?: Record<string, string>
}

interface YocoSettings {
  yoco_public_key: string
  yoco_secret_key: string
  yoco_test_public_key: string
  yoco_test_secret_key: string
}

export const getYocoKeys = async (isTest: boolean = false): Promise<{ publicKey: string, secretKey: string }> => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Authentication error:', userError)
      throw new Error(`Failed to get user: ${userError.message}`)
    }

    if (!user) {
      throw new Error('No authenticated user found')
    }

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select(isTest ? 'yoco_test_public_key, yoco_test_secret_key' : 'yoco_public_key, yoco_secret_key')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Error fetching Yoco keys:', settingsError)
      throw new Error(`Failed to fetch Yoco keys: ${settingsError.message}`)
    }

    if (!settings) {
      throw new Error('No Yoco settings found')
    }

    const typedSettings = settings as YocoSettings

    return {
      publicKey: isTest ? typedSettings.yoco_test_public_key : typedSettings.yoco_public_key,
      secretKey: isTest ? typedSettings.yoco_test_secret_key : typedSettings.yoco_secret_key,
    }
  } catch (error) {
    console.error('Error getting Yoco keys:', error)
    throw error
  }
}

export const createPaymentLink = async (data: PaymentLinkData, isTest: boolean = false): Promise<string> => {
  try {
    const { secretKey } = await getYocoKeys(isTest)
    
    if (!secretKey) {
      throw new Error('No Yoco secret key found')
    }

    console.log('Creating payment link with data:', {
      ...data,
      amountInCents: data.amountInCents,
      currency: data.currency,
    })

    // Log the request details (excluding sensitive data)
    console.log('Making request to:', `${BASE_URL}/payment-pages`)
    console.log('Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer [REDACTED]'
    })

    const response = await fetch(`${BASE_URL}/payment-pages`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: data.currency,
          value: data.amountInCents
        },
        billing: {
          email: data.metadata?.clientEmail,
          name: data.metadata?.clientName
        },
        metadata: {
          ...data.metadata,
          description: data.description
        }
      }),
    })

    // Log response status and headers
    console.log('Response status:', response.status, response.statusText)
    console.log('Response headers:', {
      'content-type': response.headers.get('content-type'),
      'cors': response.headers.get('access-control-allow-origin'),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Yoco API error response:', errorText)
      
      // Try to parse error as JSON if possible
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Parsed error details:', errorJson)
        throw new Error(`Yoco API error: ${errorJson.message || errorJson.error || 'Unknown error'}`)
      } catch (e) {
        // If parsing fails, log the raw error
        console.error('Raw error text:', errorText)
        throw new Error(`Failed to create payment link: ${response.status} ${response.statusText} - ${errorText}`)
      }
    }

    const result = await response.json()
    console.log('Payment link created successfully:', result)

    if (!result.url) {
      throw new Error('No payment URL in response')
    }

    return result.url
  } catch (error) {
    console.error('Error creating payment link:', error)
    
    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to Yoco API. Please check your internet connection and try again.')
    }
    
    // CORS errors
    if (error instanceof TypeError && error.message.includes('CORS')) {
      throw new Error('CORS error: The request was blocked. Please check your domain configuration with Yoco.')
    }
    
    // Other errors
    throw error
  }
}

export const createPaymentLinkWithRetry = async (
  data: PaymentLinkData,
  isTest: boolean = false,
  maxRetries: number = 3
): Promise<string> => {
  let retries = maxRetries

  while (retries > 0) {
    try {
      return await createPaymentLink(data, isTest)
    } catch (error) {
      retries--
      console.error(`Payment link creation failed, retries left: ${retries}`, error)
      
      if (retries <= 0) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, maxRetries - retries) * 1000))
    }
  }

  throw new Error('Failed to create payment link after all retries')
} 
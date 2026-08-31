/**
 * Fast2SMS Dispatch Service
 * Sends real-time SMS OTPs to Indian mobile numbers via Fast2SMS bulkV2 API.
 */

export interface SendFast2SmsOptions {
  phone: string;
  otp: string;
}

export const sendFast2SmsOtp = async ({
  phone,
  otp,
}: SendFast2SmsOptions): Promise<{ success: boolean; message?: string; error?: string }> => {
  const apiKey = process.env.FAST2SMS_API_KEY || '';

  // Ensure 10-digit Indian phone number without country code
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

  if (!apiKey || apiKey.startsWith('your_')) {
    console.warn('⚠️ [Fast2SMS] FAST2SMS_API_KEY is not configured in backend/.env.');
    console.log(`📱 [Fast2SMS Local Log] OTP for ${cleanPhone}: ${otp}`);
    return {
      success: true,
      message: 'Local log simulated (API key missing)',
    };
  }

  try {
    const url = 'https://www.fast2sms.com/dev/bulkV2';

    // 1. Try OTP Route (Fast2SMS Default OTP Service)
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables_values: otp,
        route: 'otp',
        numbers: cleanPhone,
      }),
    });

    let data: any = await response.json();

    // 2. If OTP route is not default or fails, fallback to Quick SMS (q) route
    if (!response.ok || !data.return) {
      console.warn('⚠️ [Fast2SMS] OTP route returned error, trying Quick SMS route:', data);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Your MyQuro verification code is ${otp}. Valid for 5 minutes.`,
          language: 'english',
          route: 'q',
          numbers: cleanPhone,
        }),
      });
      data = await response.json();
    }

    if (data.return) {
      console.log(`✅ [Fast2SMS] SMS successfully dispatched to +91 ${cleanPhone}. Req ID:`, data.request_id);
      return {
        success: true,
        message: data.message?.[0] || 'SMS sent successfully',
      };
    } else {
      const errorMsg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Fast2SMS dispatch failed';
      console.error('❌ [Fast2SMS] Dispatch failed:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (err: any) {
    console.error('❌ [Fast2SMS] Network or dispatch error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
};

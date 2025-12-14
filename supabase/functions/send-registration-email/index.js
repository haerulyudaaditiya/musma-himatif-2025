// Simple JavaScript version
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
const RESEND_API_KEY = Deno.env?.get('RESEND_API_KEY');
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, nama, nim, userId } = await req.json();

    console.log(`Sending email to: ${email}, Name: ${nama}`);

    // Generate QR Code URL
    const qrCodeData = `MUSMA2025:${userId}:${nim}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&color=1e40af&bgcolor=f8fafc&data=${encodeURIComponent(
      qrCodeData
    )}`;

    // Email HTML Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .ticket { background: white; border: 2px dashed #3b82f6; border-radius: 10px; padding: 30px; margin: 20px 0; }
          .qr-code { text-align: center; margin: 20px 0; }
          .info-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">TIKET DIGITAL MUSMA 2025</h1>
            <p style="margin:10px 0 0 0; opacity:0.9;">Himpunan Mahasiswa Teknik Informatika - UBP Karawang</p>
          </div>
          
          <div class="ticket">
            <h2 style="color:#1e40af;">Halo, ${nama}!</h2>
            <p>Terima kasih telah mendaftar sebagai peserta MUSMA 2025.</p>
            
            <div class="info-box">
              <strong>Informasi Peserta:</strong><br>
              <strong>Nama:</strong> ${nama}<br>
              <strong>NIM:</strong> ${nim}<br>
              <strong>ID Tiket:</strong> ${userId}<br>
              <strong>Status:</strong> <span style="color:#10b981;">✓ Terdaftar</span>
            </div>
            
            <div class="qr-code">
              <h3 style="color:#1e40af;">QR Code Kehadiran</h3>
              <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200" style="border:1px solid #e2e8f0; padding:10px; border-radius:8px;">
              <p style="color:#64748b; font-size:14px;"><em>Tunjukkan QR code ini saat check-in</em></p>
            </div>
            
            <div class="info-box">
              <strong>Informasi Acara:</strong><br>
              <strong>Tanggal:</strong> 16 Desember 2025<br>
              <strong>Waktu:</strong> 08:00 - 17:00 WIB<br>
              <strong>Lokasi:</strong> Auditorium Kampus UBP Karawang
            </div>
          </div>
          
          <div class="footer">
            <p style="margin:0;"><strong>Panitia MUSMA 2025 - HIMATIF UBP Karawang</strong></p>
            <p style="margin:5px 0;">Email: himatif@ubpkarawang.ac.id</p>
            <p style="margin:5px 0; font-size:11px;">© 2025 HIMATIF UBP Karawang</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MUSMA HIMATIF <onboarding@resend.dev>',
        to: [email],
        subject: `🎫 Tiket Digital MUSMA 2025 - ${nama}`,
        html: emailHtml,
      }),
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', result);
      throw new Error(result.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: result.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-registration-email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

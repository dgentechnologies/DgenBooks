import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin with the service account from environment variable
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokens, title, body: messageBody, data } = body;

    // Validate input
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tokens provided' },
        { status: 400 }
      );
    }

    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Prepare the message
    const message = {
      notification: {
        title: title,
        body: messageBody,
      },
      data: data || {},
      tokens: tokens,
    };

    // Send the notification to multiple devices using sendEachForMulticast
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `Notification sent: ${response.successCount} success, ${response.failureCount} failures`
    );

    // Collect failed tokens for potential cleanup
    const failedTokens: string[] = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`Failed to send to token ${idx}:`, resp.error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: failedTokens,
    });
  } catch (error: any) {
    console.error('Notification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

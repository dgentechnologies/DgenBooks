import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin with individual service-account environment variables
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_BOOKS_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_BOOKS_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_BOOKS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Validate required fields
    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Missing Firebase Admin environment variables!');
      console.error('Required: FIREBASE_BOOKS_PROJECT_ID, FIREBASE_BOOKS_CLIENT_EMAIL, FIREBASE_BOOKS_PRIVATE_KEY');
    } else {
      console.log('✅ Firebase Admin environment variables found');
      console.log(`📋 Project ID: ${projectId}`);
      console.log(`📧 Client Email: ${clientEmail}`);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('📨 [NOTIFICATION API] Received notification request');
  
  try {
    const body = await request.json();
    const { tokens, title, body: messageBody, data } = body;
    
    console.log('📋 [NOTIFICATION API] Request details:', {
      tokensCount: tokens?.length || 0,
      title,
      messageBodyPreview: messageBody?.substring(0, 50),
      dataKeys: data ? Object.keys(data) : []
    });

    // Validate input
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.error('❌ [NOTIFICATION API] Validation failed: No tokens provided');
      return NextResponse.json(
        { success: false, error: 'No tokens provided' },
        { status: 400 }
      );
    }

    if (!title || !messageBody) {
      console.error('❌ [NOTIFICATION API] Validation failed: Missing title or body');
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      );
    }
    
    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.error('❌ [NOTIFICATION API] Firebase Admin is not initialized!');
      return NextResponse.json(
        { success: false, error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }
    
    console.log('✅ [NOTIFICATION API] Validation passed. Preparing message...');

    // Prepare the message
    const message = {
      notification: {
        title: title,
        body: messageBody,
      },
      data: data || {},
      tokens: tokens,
    };
    
    console.log(`🚀 [NOTIFICATION API] Sending to ${tokens.length} token(s)...`);

    // Send the notification to multiple devices using sendEachForMulticast
    const response = await admin.messaging().sendEachForMulticast(message);
    
    const duration = Date.now() - startTime;

    console.log(
      `✅ [NOTIFICATION API] Notification sent: ${response.successCount} success, ${response.failureCount} failures (took ${duration}ms)`
    );

    // Collect failed tokens for potential cleanup
    const failedTokens: string[] = [];
    if (response.failureCount > 0) {
      console.warn(`⚠️ [NOTIFICATION API] ${response.failureCount} notification(s) failed:`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          const tokenPreview = tokens[idx] ? tokens[idx].substring(0, 20) + '...' : 'undefined';
          console.error(`  ❌ Token ${idx} (${tokenPreview}):`, {
            errorCode: resp.error?.code,
            errorMessage: resp.error?.message
          });
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
    const duration = Date.now() - startTime;
    console.error(`❌ [NOTIFICATION API] Error after ${duration}ms:`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

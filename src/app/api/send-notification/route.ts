import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin with the service account from environment variable
if (!admin.apps.length) {
  try {
    // Check if FIREBASE_SERVICE_ACCOUNT environment variable exists
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountEnv) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not found!');
      console.error('Please set FIREBASE_SERVICE_ACCOUNT in your environment variables.');
    } else {
      console.log('✅ FIREBASE_SERVICE_ACCOUNT environment variable found');
      console.log(`📏 FIREBASE_SERVICE_ACCOUNT length: ${serviceAccountEnv.length} characters`);
    }
    
    const serviceAccount = JSON.parse(serviceAccountEnv || '{}');
    
    // Validate service account has required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT is missing required fields!');
      console.error('Required fields: project_id, private_key, client_email');
      console.error('Found fields:', Object.keys(serviceAccount));
    } else {
      console.log('✅ FIREBASE_SERVICE_ACCOUNT has all required fields');
      console.log(`📋 Project ID: ${serviceAccount.project_id}`);
      console.log(`📧 Client Email: ${serviceAccount.client_email}`);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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

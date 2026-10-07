/*import fetch from 'node-fetch';
import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';*/

const fetch = require('node-fetch');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { fileURLToPath } require('url');

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../firebase-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
const PROJECT_ID = 'incoming-call-f3b44';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../firebase-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

async function getAccessToken() {
  const keyFile = JSON.parse(await readFile(SERVICE_ACCOUNT_PATH, 'utf8'));

  const jwtClient = new google.auth.JWT(
    keyFile.client_email,
    null,
    keyFile.private_key,
    SCOPES
  );

  const tokens = await jwtClient.authorize();
  console.log('🚀 Access Token:', tokens.access_token); // Log the access token for debugging
  return tokens.access_token;
}

export async function sendCallNotification(fcmToken, callerName, roomId,callType) {
  const accessToken = await getAccessToken();

  const projectId = 'incoming-call-f3b44';

  const messagePayload = {
    message: {
      token: fcmToken,
      notification: {
        title: `${callType} Call from ${callerName}`,
        body: `Join the call`,
      },
      data: {
        roomId,
        type: 'incoming_call',
        callerName,
        callType
      }
    }
  };

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messagePayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FCM Error: ${error}`);
  }

  return await response.json();
}


export async function sendMessageNotification(fcmToken, senderName, messageText, timestamp) {
  const accessToken = await getAccessToken();
  const projectId = 'incoming-call-f3b44'; // <-- apna firebase project id

  const messagePayload = {
    message: {
      token: fcmToken,
      notification: {
        title: `${senderName} sent a message`,
        body: `${messageText} · ${timestamp}`
      },
      data: {
        type: 'chat_message',
        senderName,
        messageText,
        timestamp,
      }
    }
  };

  console.log('🚀 Message Payload:', JSON.stringify(messagePayload, null, 2));

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messagePayload)
  });

  const responseData = await response.json(); // Parse as JSON directly
  console.log('📩 FCM Server Response:', JSON.stringify(responseData, null, 2));

  if (!response.ok) {
    console.error('❌ FCM request failed:', response.status, response.statusText);
    throw new Error(`FCM Error: ${JSON.stringify(responseData)}`);
  }

  return responseData;
}

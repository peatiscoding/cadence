# Authentication

## Goal

The application should be able to login by any OAuth2.0 services. This should be configurable via FirebaseAuth.

In addition, it must be able to perform programatically login via `firebase-admin` custom-token API.

## OAuth2.0 Provider

1. This should follow the best integration practices for Firebase UI SDK.
1. Integration must be taken on Firebase Console.

## Firebase Custom Token

1. For using custom token we will need a programatic endpoint supported by Firebase Function to perform `BOT` user login.
1. CustomToken can be then issued for such user.


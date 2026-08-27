/// Backend base URL for the oRPC API (see src/orpc/router in the TanStack
/// Start repo). Defaults to the Android emulator's alias for the host
/// machine's localhost. Override for a physical device or a deployed
/// backend with:
///
/// ```
/// flutter run --dart-define=API_BASE_URL=http://192.168.1.23:3000
/// ```
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

/// The Google OAuth **Web application** client ID (not the Android client) —
/// its audience is what the backend's `GOOGLE_CLIENT_ID` verifies ID tokens
/// against. Passed at build/run time with:
///
/// ```
/// flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
/// ```
const String googleServerClientId = String.fromEnvironment(
  'GOOGLE_SERVER_CLIENT_ID',
);

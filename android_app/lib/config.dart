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

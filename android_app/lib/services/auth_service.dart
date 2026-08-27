import 'dart:convert';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

/// Google sign-in, backed by Better Auth's native ID-token sign-in
/// (`POST /api/auth/sign-in/social`) on the TanStack Start backend. The
/// backend verifies the Google ID token server-side and returns a bearer
/// session token via the `set-auth-token` response header (from Better
/// Auth's `bearer` plugin) — Dart's plain [http.Client] has no cookie jar,
/// so a bearer token is what this app attaches to every subsequent request
/// instead of a session cookie.
class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  static const _tokenPrefsKey = 'auth_token';

  final http.Client _client;
  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    await GoogleSignIn.instance.initialize(
      serverClientId: googleServerClientId,
    );
    _initialized = true;
  }

  /// Opens the native Google account picker, then exchanges the resulting ID
  /// token for a backend session. Returns `true` on success.
  Future<bool> signIn() async {
    await _ensureInitialized();

    final GoogleSignInAccount account = await GoogleSignIn.instance
        .authenticate();
    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw AuthException('Google did not return an ID token');
    }

    final response = await _client.post(
      Uri.parse('$apiBaseUrl/api/auth/sign-in/social'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'provider': 'google',
        'idToken': {'token': idToken},
      }),
    );

    if (response.statusCode >= 400) {
      throw AuthException('Sign-in failed (${response.statusCode})');
    }

    final token = response.headers['set-auth-token'];
    if (token == null) {
      throw AuthException('Backend did not return a session token');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenPrefsKey, token);
    return true;
  }

  Future<void> signOut() async {
    await _ensureInitialized();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenPrefsKey);
    await GoogleSignIn.instance.signOut();
  }

  Future<String?> currentToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenPrefsKey);
  }

  /// Clears a stored token without touching the Google session — used when a
  /// request comes back 401, so the app falls back to the sign-in screen
  /// instead of looping on a stale/expired token.
  Future<void> clearStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenPrefsKey);
  }
}

class AuthException implements Exception {
  AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

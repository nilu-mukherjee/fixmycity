import 'package:flutter/material.dart';

import '../services/service_locator.dart';
import '../widgets/hammer_icon.dart';
import 'home_screen.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  bool _signingIn = false;

  Future<void> _signIn() async {
    setState(() => _signingIn = true);
    try {
      await authService.signIn();
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (e) {
      debugPrint('Sign-in failed: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign-in failed. Please try again.')),
      );
    } finally {
      if (mounted) setState(() => _signingIn = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const HammerIcon(size: 72),
              const SizedBox(height: 16),
              RichText(
                text: const TextSpan(
                  style: TextStyle(
                    fontFamily: 'Staatliches',
                    fontSize: 32,
                    color: Colors.black,
                  ),
                  children: [
                    TextSpan(text: 'Fix'),
                    TextSpan(
                      text: 'My',
                      style: TextStyle(color: Color(0xFFE2571A)),
                    ),
                    TextSpan(text: 'City'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sign in to report issues and track your submissions.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: _signingIn ? null : _signIn,
                icon: _signingIn
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.login),
                label: const Text('Sign in with Google'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

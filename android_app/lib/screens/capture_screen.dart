import 'dart:io';

import 'package:camera/camera.dart' show XFile;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../models/report.dart';
import '../services/http_report_api.dart';
import '../services/service_locator.dart';
import '../widgets/address_text.dart';
import 'live_camera_screen.dart';
import 'presubmit_screen.dart';

/// Step 1 of the citizen flow (project.md): open the app, start a complaint,
/// take a live photo (via [LiveCameraScreen] — a plain capture UI with an
/// on-device object-detection overlay as a framing aid only; the real
/// civic-issue classification stays server-side via Gemini Vision), capture
/// location, then send it off for AI classification automatically — as soon
/// as both are ready, with no extra button tap. Category, severity, and
/// description are all editable next, on [PresubmitScreen]'s form, so
/// there's nothing to fill in here first.
class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  XFile? _photo;
  Position? _position;
  bool _locating = false;
  bool _analyzing = false;
  String? _error;

  Future<void> _takePhoto() async {
    try {
      final photo = await Navigator.of(context).push<XFile>(
        MaterialPageRoute(builder: (_) => const LiveCameraScreen()),
      );
      if (photo != null) {
        setState(() {
          _photo = photo;
          _error = null;
        });
        await _locateDevice();
        if (_photo != null && _position != null) {
          await _analyze();
        }
      }
    } catch (e) {
      setState(() => _error = 'Could not open camera: $e');
    }
  }

  Future<void> _locateDevice() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Location permission denied. Enable it to attach GPS to your report.';
          _locating = false;
        });
        return;
      }

      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error = 'Location services are off. Turn on GPS to attach a location.';
          _locating = false;
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      setState(() {
        _position = position;
        _locating = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not get location: $e';
        _locating = false;
      });
    }
  }

  Future<void> _analyze() async {
    if (_photo == null || _position == null) return;

    setState(() {
      _analyzing = true;
      _error = null;
    });

    try {
      final location = GeoPoint(
        latitude: _position!.latitude,
        longitude: _position!.longitude,
        accuracyMeters: _position!.accuracy,
      );

      final result = await reportApi.classifyReport(
        photoPath: _photo!.path,
        location: location,
        // No pre-analysis note — the citizen reviews and can rewrite the
        // AI's description on the presubmit form that comes next.
        urgencyNote: '',
      );

      if (!mounted) return;
      final ticket = await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PresubmitScreen(presubmit: result)),
      );
      if (!mounted) return;
      if (ticket != null) {
        Navigator.of(context).pop(ticket);
      }
    } on NotCivicIssueException catch (e) {
      // Force a retake rather than letting them resubmit the same photo.
      setState(() {
        _photo = null;
        _position = null;
        _error = "$e Please retake a photo of the actual issue.";
      });
    } catch (e) {
      setState(() => _error = 'Could not analyze report: $e');
    } finally {
      if (mounted) setState(() => _analyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report an Issue')),
      body: _analyzing
          ? const _AnalyzingView()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _PhotoPicker(photo: _photo, onCamera: _takePhoto),
                const SizedBox(height: 16),
                _LocationStatus(position: _position, locating: _locating),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
              ],
            ),
    );
  }
}

class _AnalyzingView extends StatelessWidget {
  const _AnalyzingView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Analyzing your report…'),
        ],
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({required this.photo, required this.onCamera});

  final XFile? photo;
  final VoidCallback onCamera;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            clipBehavior: Clip.antiAlias,
            child: photo == null
                ? const Center(
                    child: Icon(Icons.photo_camera_outlined, size: 48),
                  )
                : Image.file(File(photo!.path), fit: BoxFit.cover),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: onCamera,
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(photo == null ? 'Take Photo' : 'Retake Photo'),
          ),
        ),
      ],
    );
  }
}

class _LocationStatus extends StatelessWidget {
  const _LocationStatus({required this.position, required this.locating});

  final Position? position;
  final bool locating;

  @override
  Widget build(BuildContext context) {
    if (locating) {
      return const Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 8),
          Text('Getting your location…'),
        ],
      );
    }
    if (position == null) {
      return const Text('Location will be captured automatically with your photo.');
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.location_on, size: 18),
        const SizedBox(width: 4),
        Expanded(
          child: AddressText(
            location: GeoPoint(
              latitude: position!.latitude,
              longitude: position!.longitude,
              accuracyMeters: position!.accuracy,
            ),
          ),
        ),
      ],
    );
  }
}

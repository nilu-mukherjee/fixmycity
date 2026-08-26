import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../models/report.dart';
import '../services/service_locator.dart';
import 'presubmit_screen.dart';

/// Step 1 of the citizen flow (project.md): open the app, start a complaint,
/// take a plain photo (no on-device/live object detection — that's server-
/// side via Gemini Vision), capture location and an urgency note, then send
/// it off for AI classification.
class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  final _descriptionController = TextEditingController();
  final _picker = ImagePicker();

  XFile? _photo;
  Position? _position;
  String _urgency = 'Medium';
  bool _locating = false;
  bool _submitting = false;
  String? _error;

  static const _urgencyLevels = ['Low', 'Medium', 'High', 'Emergency'];

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final photo = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        imageQuality: 85,
      );
      if (photo != null) {
        setState(() => _photo = photo);
        _locateDevice();
      }
    } catch (e) {
      setState(() => _error = 'Could not open camera/gallery: $e');
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
      _submitting = true;
      _error = null;
    });

    try {
      final location = GeoPoint(
        latitude: _position!.latitude,
        longitude: _position!.longitude,
        accuracyMeters: _position!.accuracy,
      );
      final urgencyNote =
          'Urgency: $_urgency. ${_descriptionController.text.trim()}';

      final result = await reportApi.classifyReport(
        photoPath: _photo!.path,
        location: location,
        urgencyNote: urgencyNote,
      );

      if (!mounted) return;
      final ticket = await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PresubmitScreen(presubmit: result)),
      );
      if (!mounted) return;
      if (ticket != null) {
        Navigator.of(context).pop(ticket);
      }
    } catch (e) {
      setState(() => _error = 'Could not analyze report: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canAnalyze = _photo != null && _position != null && !_submitting;

    return Scaffold(
      appBar: AppBar(title: const Text('Report an Issue')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _PhotoPicker(
            photo: _photo,
            onCamera: () => _pickPhoto(ImageSource.camera),
            onGallery: () => _pickPhoto(ImageSource.gallery),
          ),
          const SizedBox(height: 16),
          _LocationStatus(position: _position, locating: _locating),
          const SizedBox(height: 16),
          Text('Urgency', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final level in _urgencyLevels)
                ChoiceChip(
                  label: Text(level),
                  selected: _urgency == level,
                  onSelected: (_) => setState(() => _urgency = level),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Short description (optional)',
              hintText: 'e.g. Big pothole near Whitefield main road, dangerous for bikes.',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: canAnalyze ? _analyze : null,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome),
            label: Text(_submitting ? 'Analyzing…' : 'Analyze Report'),
          ),
        ],
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({
    required this.photo,
    required this.onCamera,
    required this.onGallery,
  });

  final XFile? photo;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

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
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onCamera,
                icon: const Icon(Icons.camera_alt_outlined),
                label: const Text('Camera'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onGallery,
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Gallery'),
              ),
            ),
          ],
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
      children: [
        const Icon(Icons.location_on, size: 18),
        const SizedBox(width: 4),
        Text(
          '${position!.latitude.toStringAsFixed(5)}, '
          '${position!.longitude.toStringAsFixed(5)} '
          '(±${position!.accuracy.toStringAsFixed(0)}m)',
        ),
      ],
    );
  }
}

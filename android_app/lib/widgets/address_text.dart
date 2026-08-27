import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';

import '../models/report.dart';

/// Reverse-geocodes a [GeoPoint] into a human-readable full address instead
/// of raw lat/lng — falls back to coordinates if geocoding fails (no
/// network, no platform geocoder, or nothing found for that point).
class AddressText extends StatefulWidget {
  const AddressText({super.key, required this.location, this.style});

  final GeoPoint location;
  final TextStyle? style;

  @override
  State<AddressText> createState() => _AddressTextState();
}

class _AddressTextState extends State<AddressText> {
  late final Future<String> _addressFuture = _resolve();

  Future<String> _resolve() async {
    try {
      final placemarks = await placemarkFromCoordinates(
        widget.location.latitude,
        widget.location.longitude,
      );
      if (placemarks.isEmpty) return _coordinates();
      final placemark = placemarks.first;
      final parts = <String>{
        for (final part in [
          placemark.street,
          placemark.subLocality,
          placemark.locality,
          placemark.administrativeArea,
          placemark.postalCode,
          placemark.country,
        ])
          if (part != null && part.trim().isNotEmpty) part.trim(),
      };
      return parts.isEmpty ? _coordinates() : parts.join(', ');
    } catch (_) {
      return _coordinates();
    }
  }

  String _coordinates() =>
      '${widget.location.latitude.toStringAsFixed(5)}, '
      '${widget.location.longitude.toStringAsFixed(5)}';

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _addressFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Text('Looking up address…', style: widget.style);
        }
        return Text(snapshot.data ?? _coordinates(), style: widget.style);
      },
    );
  }
}

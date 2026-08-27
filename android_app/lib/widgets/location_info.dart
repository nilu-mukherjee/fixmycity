import 'package:flutter/material.dart';

import '../models/report.dart';
import 'address_text.dart';

/// Full address + GPS accuracy, both styled as small/muted supporting
/// detail (matching ListTile's subtitle look) rather than a title —
/// the address can run 2-3 lines, so the icon stays top-aligned instead
/// of ListTile's default vertical-center, which looked off once the
/// address stopped being a single short coordinate pair.
class LocationInfo extends StatelessWidget {
  const LocationInfo({super.key, required this.location, this.onTap});

  final GeoPoint location;

  /// If set, the whole row is tappable (e.g. to open Google Maps) and
  /// shows an "open" affordance icon.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mutedStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );

    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.location_on_outlined, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AddressText(location: location, style: mutedStyle),
              const SizedBox(height: 2),
              Text(
                location.accuracyMeters == null
                    ? 'Accuracy unknown'
                    : '±${location.accuracyMeters!.toStringAsFixed(0)}m accuracy',
                style: mutedStyle,
              ),
            ],
          ),
        ),
        if (onTap != null) ...[
          const SizedBox(width: 8),
          Icon(Icons.open_in_new, size: 16, color: theme.colorScheme.onSurfaceVariant),
        ],
      ],
    );

    if (onTap == null) return row;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: row),
    );
  }
}

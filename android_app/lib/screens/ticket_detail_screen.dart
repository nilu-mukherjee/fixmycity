import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/report.dart';
import '../utils/maps.dart';
import '../widgets/location_info.dart';
import '../widgets/severity_chip.dart';
import '../widgets/status_timeline.dart';
import '../widgets/trust_score_card.dart';

/// Step 3 of the citizen flow: the confirmation + tracking view for a
/// created ticket (project.md's "Public Status Page").
class TicketDetailScreen extends StatelessWidget {
  const TicketDetailScreen({super.key, required this.ticket});

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ticket.displayId)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: ticket.photoPath.isNotEmpty
                  ? Image.file(File(ticket.photoPath), fit: BoxFit.cover)
                  : ticket.photoGcsObjectName.isNotEmpty
                  ? Image.network(ticket.photoUrl, fit: BoxFit.cover)
                  : ColoredBox(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: Icon(
                        Icons.image_not_supported_outlined,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Full-width line for the title — sharing a Row
                        // with the chip left too little room once this
                        // column also had to share space with the vertical
                        // status tracker, causing "Footpath" to break
                        // mid-word ("Footpat"/"h").
                        Text(
                          ticket.category.label,
                          style: Theme.of(context).textTheme.titleLarge,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        SeverityChip(severity: ticket.severity),
                        const SizedBox(height: 6),
                        _MetaLine(
                          icon: Icons.apartment_rounded,
                          iconColor: Colors.deepPurple,
                          text: 'Routed to ${ticket.department}',
                        ),
                        const SizedBox(height: 10),
                        Text(
                          ticket.description,
                          style: Theme.of(
                            context,
                          ).textTheme.bodyMedium?.copyWith(fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        _MetaLine(
                          icon: Icons.event_rounded,
                          iconColor: Colors.blue,
                          text:
                              'Reported ${DateFormat.yMMMd().add_jm().format(ticket.createdAt)}',
                        ),
                        const SizedBox(height: 10),
                        LocationInfo(
                          location: ticket.location,
                          onTap: () => openInMaps(ticket.location),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  StatusTimeline(status: ticket.status, direction: Axis.vertical),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TrustScoreCard(score: ticket.trustScore),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: OutlinedButton.icon(
          onPressed: () =>
              Navigator.of(context).popUntil((route) => route.isFirst),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Back to My Reports'),
        ),
      ),
    );
  }
}

/// A colorful icon + a line of text styled like the "Reported ..." date
/// line (small, muted) — used for both the department and date rows so
/// they read consistently.
class _MetaLine extends StatelessWidget {
  const _MetaLine({
    required this.icon,
    required this.iconColor,
    required this.text,
  });

  final IconData icon;
  final Color iconColor;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodySmall),
        ),
      ],
    );
  }
}

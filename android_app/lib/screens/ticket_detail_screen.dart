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
              child: StatusTimeline(status: ticket.status),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  ticket.category.label,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              SeverityChip(severity: ticket.severity),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Routed to ${ticket.department}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Text(ticket.description),
          const SizedBox(height: 8),
          Text(
            'Reported ${DateFormat.yMMMd().add_jm().format(ticket.createdAt)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          LocationInfo(
            location: ticket.location,
            onTap: () => openInMaps(ticket.location),
          ),
          const SizedBox(height: 4),
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

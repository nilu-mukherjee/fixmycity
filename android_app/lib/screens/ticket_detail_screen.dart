import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/report.dart';
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
      appBar: AppBar(title: Text(ticket.id)),
      body: ListView(
        padding: const EdgeInsets.all(16),
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
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.location_on_outlined),
            title: Text(
              '${ticket.location.latitude.toStringAsFixed(5)}, '
              '${ticket.location.longitude.toStringAsFixed(5)}',
            ),
            subtitle: Text(
              ticket.location.accuracyMeters == null
                  ? 'Accuracy unknown'
                  : '±${ticket.location.accuracyMeters!.toStringAsFixed(0)}m accuracy',
            ),
          ),
          const SizedBox(height: 4),
          TrustScoreCard(score: ticket.trustScore),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () =>
                Navigator.of(context).popUntil((route) => route.isFirst),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back to My Reports'),
          ),
        ],
      ),
    );
  }
}

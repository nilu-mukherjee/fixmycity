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
          const SizedBox(height: 16),
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

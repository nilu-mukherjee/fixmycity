import 'package:flutter/material.dart';

import '../models/report.dart';

/// Shows the trust-score total plus its four-part breakdown, per project.md's
/// "Extra Winning Feature: Trust Score".
class TrustScoreCard extends StatelessWidget {
  const TrustScoreCard({super.key, required this.score});

  final TrustScoreBreakdown score;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.verified_outlined, color: scheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Trust Score',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const Spacer(),
                Text(
                  '${score.total}/100',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: scheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: score.total / 100,
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 12),
            _ScoreRow(label: 'Clear image', points: score.clearImagePoints, max: 30),
            _ScoreRow(
              label: 'Exact location',
              points: score.exactLocationPoints,
              max: 30,
            ),
            _ScoreRow(
              label: 'Multiple nearby reports',
              points: score.nearbyReportsPoints,
              max: 25,
            ),
            _ScoreRow(
              label: 'Recent report',
              points: score.recentReportPoints,
              max: 15,
            ),
          ],
        ),
      ),
    );
  }
}

class _ScoreRow extends StatelessWidget {
  const _ScoreRow({required this.label, required this.points, required this.max});

  final String label;
  final int points;
  final int max;

  @override
  Widget build(BuildContext context) {
    final earned = points > 0;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(
            earned ? Icons.check_circle : Icons.circle_outlined,
            size: 16,
            color: earned
                ? Colors.green
                : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
          Text('+$points', style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}

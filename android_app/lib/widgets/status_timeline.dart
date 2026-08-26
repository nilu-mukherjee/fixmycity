import 'package:flutter/material.dart';

import '../models/report.dart';

/// Horizontal received → verified → assigned → in progress → resolved
/// tracker, per project.md's "Public Status Page" feature.
class StatusTimeline extends StatelessWidget {
  const StatusTimeline({super.key, required this.status});

  final TicketStatus status;

  @override
  Widget build(BuildContext context) {
    final steps = TicketStatus.values;
    final currentIndex = steps.indexOf(status);

    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                color: i <= currentIndex
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
          _StepDot(
            label: steps[i].label,
            isDone: i < currentIndex,
            isCurrent: i == currentIndex,
          ),
        ],
      ],
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({
    required this.label,
    required this.isDone,
    required this.isCurrent,
  });

  final String label;
  final bool isDone;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = isDone || isCurrent;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: active ? scheme.primary : scheme.surfaceContainerHighest,
          child: isDone
              ? Icon(Icons.check, size: 14, color: scheme.onPrimary)
              : null,
        ),
        const SizedBox(height: 4),
        SizedBox(
          width: 64,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
              color: active ? scheme.onSurface : scheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../models/report.dart';

/// Received → verified → assigned → in progress → resolved tracker, per
/// project.md's "Public Status Page" feature. [direction] picks between
/// the original horizontal strip and a vertical list (e.g. for a
/// side-by-side detail layout where the tracker sits in its own column).
class StatusTimeline extends StatelessWidget {
  const StatusTimeline({
    super.key,
    required this.status,
    this.direction = Axis.horizontal,
  });

  final TicketStatus status;
  final Axis direction;

  @override
  Widget build(BuildContext context) {
    final steps = TicketStatus.values;
    final currentIndex = steps.indexOf(status);
    final scheme = Theme.of(context).colorScheme;

    if (direction == Axis.vertical) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < steps.length; i++) ...[
            if (i > 0)
              Padding(
                // Centered under the 24dp-diameter dot above/below it.
                padding: const EdgeInsets.only(left: 11),
                child: Container(
                  width: 2,
                  height: 16,
                  color: i <= currentIndex
                      ? scheme.primary
                      : scheme.outlineVariant,
                ),
              ),
            _StepRow(
              label: steps[i].label,
              isDone: i < currentIndex,
              isCurrent: i == currentIndex,
            ),
          ],
        ],
      );
    }

    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                color: i <= currentIndex ? scheme.primary : scheme.outlineVariant,
              ),
            ),
          // Flex, not a fixed width — a fixed 64dp per label imposed a
          // 320dp minimum row width that didn't fit narrower screens
          // (overflowed past the edge on the A34).
          Expanded(
            flex: 3,
            child: _StepDot(
              label: steps[i].label,
              isDone: i < currentIndex,
              isCurrent: i == currentIndex,
            ),
          ),
        ],
      ],
    );
  }
}

/// This stepper is dense/glanceable UI, not reading text — pinned to its
/// own fixed scale regardless of the system font size so a single word
/// like "Received" stays on one line instead of breaking mid-word once
/// the ambient text scale (up to 1.3x app-wide) left it too wide.
class _StepLabel extends StatelessWidget {
  const _StepLabel({
    required this.label,
    required this.active,
    required this.isCurrent,
    required this.textAlign,
  });

  final String label;
  final bool active;
  final bool isCurrent;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.noScaling),
      child: Text(
        label,
        textAlign: textAlign,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 10,
          fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
          color: active ? scheme.onSurface : scheme.onSurfaceVariant,
        ),
      ),
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
        _StepLabel(
          label: label,
          active: active,
          isCurrent: isCurrent,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
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

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: active ? scheme.primary : scheme.surfaceContainerHighest,
          child: isDone
              ? Icon(Icons.check, size: 14, color: scheme.onPrimary)
              : null,
        ),
        const SizedBox(width: 8),
        _StepLabel(
          label: label,
          active: active,
          isCurrent: isCurrent,
          textAlign: TextAlign.start,
        ),
      ],
    );
  }
}

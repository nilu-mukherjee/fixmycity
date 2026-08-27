import 'package:flutter/material.dart';

import '../models/report.dart';

/// Priority indicator — icon + text, styled like the trust-score line
/// rather than a button/chip, with color signaling the severity level.
class SeverityChip extends StatelessWidget {
  const SeverityChip({super.key, required this.severity});

  final Severity severity;

  Color _color() => switch (severity) {
    Severity.low => Colors.green,
    Severity.medium => Colors.orange,
    Severity.high => Colors.deepOrange,
    Severity.emergency => Colors.red,
  };

  @override
  Widget build(BuildContext context) {
    final color = _color();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.flag_rounded, size: 16, color: color),
        const SizedBox(width: 4),
        Text(
          severity.label,
          style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
        ),
      ],
    );
  }
}

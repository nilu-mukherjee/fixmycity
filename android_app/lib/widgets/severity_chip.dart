import 'package:flutter/material.dart';

import '../models/report.dart';

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
    return Chip(
      label: Text(
        severity.label,
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
      ),
      backgroundColor: color.withValues(alpha: 0.12),
      side: BorderSide(color: color.withValues(alpha: 0.4)),
      visualDensity: VisualDensity.compact,
    );
  }
}

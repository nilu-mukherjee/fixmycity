import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Hand-drawn brand mark (two rotated rounded rects, no image asset) —
/// mirrors the inline SVG used in the web nav/admin header exactly:
/// a head bar and a handle bar, both rotated 45 degrees around center.
class HammerIcon extends StatelessWidget {
  const HammerIcon({
    super.key,
    this.size = 24,
    this.color = const Color(0xFFE2571A),
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size(size, size), painter: _HammerPainter(color));
  }
}

class _HammerPainter extends CustomPainter {
  _HammerPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    final paint = Paint()..color = color;

    void drawRRect(double x, double y, double w, double h, double r) {
      final rect = Rect.fromLTWH(x * scale, y * scale, w * scale, h * scale);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(r * scale)),
        paint,
      );
    }

    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(math.pi / 4);
    drawRRect(-5, -10, 10, 6, 1.5); // head
    drawRRect(-1.5, -3, 3, 12, 1.5); // handle
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _HammerPainter oldDelegate) =>
      oldDelegate.color != color;
}

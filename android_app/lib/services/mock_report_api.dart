import 'dart:math';

import '../models/report.dart';
import 'report_api.dart';

/// Stands in for the not-yet-built Cloud Run/Genkit backend.
///
/// The classification step (category/severity from the photo) is genuinely
/// mocked — that needs real Gemini Vision. But duplicate-detection and the
/// trust score are implemented for real against an in-memory ticket store,
/// using the same approach the backend is meant to use (haversine distance +
/// category match, per project.md's "Data Store" section), so this class
/// doubles as a working reference for that logic.
class MockReportApi implements ReportApi {
  MockReportApi() {
    _seedSampleTickets();
  }

  final List<Ticket> _tickets = [];
  int _nextId = 1;

  /// Reports within this radius of an existing ticket, in the same category,
  /// are treated as duplicates/reinforcements of the same underlying issue.
  static const double _duplicateRadiusMeters = 150;

  /// A duplicate is only "recent" (for the trust-score recency bonus) if it
  /// landed within this window.
  static const Duration _recentWindow = Duration(hours: 48);

  void _seedSampleTickets() {
    final now = DateTime.now();
    final n1 = _nextId++;
    final n2 = _nextId++;
    _tickets.addAll([
      Ticket(
        id: _issueId(n1),
        ticketNumber: n1,
        photoPath: '',
        photoGcsObjectName: '',
        category: IssueCategory.pothole,
        severity: Severity.high,
        description: 'Deep pothole near the main road junction.',
        location: const GeoPoint(
          latitude: 12.9698,
          longitude: 77.7500,
          accuracyMeters: 8,
        ),
        trustScore: const TrustScoreBreakdown(
          clearImagePoints: 30,
          exactLocationPoints: 30,
          nearbyReportsPoints: 25,
          recentReportPoints: 15,
        ),
        status: TicketStatus.assigned,
        createdAt: now.subtract(const Duration(hours: 6)),
      ),
      Ticket(
        id: _issueId(n2),
        ticketNumber: n2,
        photoPath: '',
        photoGcsObjectName: '',
        category: IssueCategory.garbage,
        severity: Severity.medium,
        description: 'Overflowing garbage bin, uncollected for days.',
        location: const GeoPoint(
          latitude: 12.9352,
          longitude: 77.6146,
          accuracyMeters: 12,
        ),
        trustScore: const TrustScoreBreakdown(
          clearImagePoints: 30,
          exactLocationPoints: 30,
          nearbyReportsPoints: 0,
          recentReportPoints: 15,
        ),
        status: TicketStatus.received,
        createdAt: now.subtract(const Duration(days: 1)),
      ),
    ]);
  }

  String _issueId(int n) => 'FMC-${1000 + n}';

  @override
  Future<PresubmitResult> classifyReport({
    required String photoPath,
    required GeoPoint location,
    required String urgencyNote,
  }) async {
    // Simulated network + Genkit flow latency.
    await Future.delayed(const Duration(milliseconds: 900));

    final category = _mockClassify(urgencyNote);
    final nearby = _nearbyMatches(location, category);
    final trustScore = _scoreReport(
      location: location,
      nearbyMatches: nearby,
    );

    return PresubmitResult(
      photoPath: photoPath,
      category: category,
      severity: _mockSeverity(urgencyNote, nearby.length),
      description: _mockDescription(category, urgencyNote),
      location: location,
      urgencyNote: urgencyNote,
      trustScore: trustScore,
      nearbyDuplicateCount: nearby.length,
    );
  }

  @override
  Future<Ticket> createTicket(PresubmitResult presubmit) async {
    await Future.delayed(const Duration(milliseconds: 400));

    final n = _nextId++;
    final ticket = Ticket(
      id: _issueId(n),
      ticketNumber: n,
      photoPath: presubmit.photoPath,
      photoGcsObjectName: '',
      category: presubmit.category,
      severity: presubmit.severity,
      description: presubmit.description,
      location: presubmit.location,
      trustScore: presubmit.trustScore,
      status: TicketStatus.received,
      createdAt: DateTime.now(),
    );
    _tickets.insert(0, ticket);
    return ticket;
  }

  @override
  Future<List<Ticket>> listMyTickets() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return List.unmodifiable(_tickets);
  }

  // --- Classification is genuinely mocked (needs real Gemini Vision) ---

  IssueCategory _mockClassify(String urgencyNote) {
    final text = urgencyNote.toLowerCase();
    for (final category in IssueCategory.values) {
      final keywords = switch (category) {
        IssueCategory.pothole => ['pothole', 'road damage', 'crater'],
        IssueCategory.garbage => ['garbage', 'trash', 'waste'],
        IssueCategory.streetlight => ['streetlight', 'light', 'lamp'],
        IssueCategory.drainage => ['drain', 'sewage'],
        IssueCategory.waterLeakage => ['water leak', 'leakage', 'pipe'],
        IssueCategory.roadBlockage => ['blocked', 'blockage', 'fallen tree'],
        IssueCategory.unsafeFootpath => ['footpath', 'sidewalk', 'pavement'],
      };
      if (keywords.any(text.contains)) return category;
    }
    // No keyword hit: default to the category most cities report most often.
    return IssueCategory.pothole;
  }

  Severity _mockSeverity(String urgencyNote, int nearbyMatchCount) {
    final text = urgencyNote.toLowerCase();
    if (text.contains('danger') || text.contains('emergency')) {
      return Severity.emergency;
    }
    if (nearbyMatchCount >= 3) return Severity.high;
    if (nearbyMatchCount >= 1) return Severity.medium;
    return Severity.low;
  }

  String _mockDescription(IssueCategory category, String urgencyNote) {
    final base = 'AI-detected ${category.label.toLowerCase()} from the '
        'submitted photo.';
    return urgencyNote.trim().isEmpty ? base : '$base ${urgencyNote.trim()}';
  }

  // --- Duplicate detection + trust score: real logic against mock data ---

  List<Ticket> _nearbyMatches(GeoPoint location, IssueCategory category) {
    return _tickets
        .where((t) => t.category == category)
        .where(
          (t) =>
              _haversineMeters(location, t.location) <= _duplicateRadiusMeters,
        )
        .toList();
  }

  TrustScoreBreakdown _scoreReport({
    required GeoPoint location,
    required List<Ticket> nearbyMatches,
  }) {
    // Clear image: needs real Gemini Vision image-quality assessment on the
    // backend; assume a decent capture for the mock.
    const clearImagePoints = 30;

    final accuracy = location.accuracyMeters;
    final exactLocationPoints = accuracy == null
        ? 0
        : accuracy <= 20
        ? 30
        : accuracy <= 50
        ? 15
        : 0;

    final nearbyReportsPoints = switch (nearbyMatches.length) {
      0 => 0,
      1 => 10,
      2 => 18,
      _ => 25,
    };

    final hasRecentMatch = nearbyMatches.any(
      (t) => DateTime.now().difference(t.createdAt) <= _recentWindow,
    );
    final recentReportPoints = hasRecentMatch ? 15 : 0;

    return TrustScoreBreakdown(
      clearImagePoints: clearImagePoints,
      exactLocationPoints: exactLocationPoints,
      nearbyReportsPoints: nearbyReportsPoints,
      recentReportPoints: recentReportPoints,
    );
  }

  /// Great-circle distance between two points, in meters.
  double _haversineMeters(GeoPoint a, GeoPoint b) {
    const earthRadiusMeters = 6371000.0;
    final lat1 = _degToRad(a.latitude);
    final lat2 = _degToRad(b.latitude);
    final dLat = _degToRad(b.latitude - a.latitude);
    final dLon = _degToRad(b.longitude - a.longitude);

    final h =
        sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(h), sqrt(1 - h));
    return earthRadiusMeters * c;
  }

  double _degToRad(double deg) => deg * (pi / 180);
}

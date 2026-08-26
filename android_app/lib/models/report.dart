/// Domain models for the FixMyCity citizen report → ticket pipeline.
///
/// These mirror what the backend (Genkit flow + Convex, per project.md) is
/// expected to return once it exists. [MockReportApi] fills this shape with
/// simulated data so the app is fully demoable before that backend is built.
library;

enum IssueCategory {
  pothole,
  garbage,
  streetlight,
  drainage,
  waterLeakage,
  roadBlockage,
  unsafeFootpath;

  String get label => switch (this) {
    IssueCategory.pothole => 'Pothole',
    IssueCategory.garbage => 'Garbage Overflow',
    IssueCategory.streetlight => 'Broken Streetlight',
    IssueCategory.drainage => 'Open Drainage',
    IssueCategory.waterLeakage => 'Water Leakage',
    IssueCategory.roadBlockage => 'Road Blockage',
    IssueCategory.unsafeFootpath => 'Unsafe Footpath',
  };

  /// The mocked department-routing table (project.md: "mock the department
  /// routing", no real municipal integration).
  String get department => switch (this) {
    IssueCategory.pothole => 'Road Department',
    IssueCategory.roadBlockage => 'Road Department',
    IssueCategory.unsafeFootpath => 'Road Department',
    IssueCategory.garbage => 'Waste Management',
    IssueCategory.streetlight => 'Electricity / Streetlight Team',
    IssueCategory.drainage => 'Water Board',
    IssueCategory.waterLeakage => 'Water Board',
  };

  /// Wire value used by the backend (snake_case, see convex/schema.ts).
  String get apiValue => switch (this) {
    IssueCategory.pothole => 'pothole',
    IssueCategory.garbage => 'garbage',
    IssueCategory.streetlight => 'streetlight',
    IssueCategory.drainage => 'drainage',
    IssueCategory.waterLeakage => 'water_leakage',
    IssueCategory.roadBlockage => 'road_blockage',
    IssueCategory.unsafeFootpath => 'unsafe_footpath',
  };

  static IssueCategory fromApi(String value) => switch (value) {
    'pothole' => IssueCategory.pothole,
    'garbage' => IssueCategory.garbage,
    'streetlight' => IssueCategory.streetlight,
    'drainage' => IssueCategory.drainage,
    'water_leakage' => IssueCategory.waterLeakage,
    'road_blockage' => IssueCategory.roadBlockage,
    'unsafe_footpath' => IssueCategory.unsafeFootpath,
    _ => throw ArgumentError('Unknown category: $value'),
  };
}

enum Severity {
  low,
  medium,
  high,
  emergency;

  String get label => switch (this) {
    Severity.low => 'Low',
    Severity.medium => 'Medium',
    Severity.high => 'High',
    Severity.emergency => 'Emergency',
  };

  /// Wire value used by the backend (matches the Dart enum name exactly).
  String get apiValue => switch (this) {
    Severity.low => 'low',
    Severity.medium => 'medium',
    Severity.high => 'high',
    Severity.emergency => 'emergency',
  };

  static Severity fromApi(String value) => switch (value) {
    'low' => Severity.low,
    'medium' => Severity.medium,
    'high' => Severity.high,
    'emergency' => Severity.emergency,
    _ => throw ArgumentError('Unknown severity: $value'),
  };
}

enum TicketStatus {
  received,
  verified,
  assigned,
  inProgress,
  resolved;

  String get label => switch (this) {
    TicketStatus.received => 'Received',
    TicketStatus.verified => 'Verified',
    TicketStatus.assigned => 'Assigned',
    TicketStatus.inProgress => 'In Progress',
    TicketStatus.resolved => 'Resolved',
  };

  /// Wire value used by the backend (snake_case, see convex/schema.ts).
  String get apiValue => switch (this) {
    TicketStatus.received => 'received',
    TicketStatus.verified => 'verified',
    TicketStatus.assigned => 'assigned',
    TicketStatus.inProgress => 'in_progress',
    TicketStatus.resolved => 'resolved',
  };

  static TicketStatus fromApi(String value) => switch (value) {
    'received' => TicketStatus.received,
    'verified' => TicketStatus.verified,
    'assigned' => TicketStatus.assigned,
    'in_progress' => TicketStatus.inProgress,
    'resolved' => TicketStatus.resolved,
    _ => throw ArgumentError('Unknown status: $value'),
  };
}

class GeoPoint {
  const GeoPoint({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters,
  });

  final double latitude;
  final double longitude;

  /// GPS accuracy radius in meters, if known. Drives the "exact location"
  /// trust-score component — a tighter fix scores higher.
  final double? accuracyMeters;
}

/// The breakdown behind the trust-score "extra winning feature" from
/// project.md: clear image +30, exact location +30, multiple nearby reports
/// +25, recent report +15 (max 100).
class TrustScoreBreakdown {
  const TrustScoreBreakdown({
    required this.clearImagePoints,
    required this.exactLocationPoints,
    required this.nearbyReportsPoints,
    required this.recentReportPoints,
  });

  final int clearImagePoints;
  final int exactLocationPoints;
  final int nearbyReportsPoints;
  final int recentReportPoints;

  int get total =>
      clearImagePoints +
      exactLocationPoints +
      nearbyReportsPoints +
      recentReportPoints;

  factory TrustScoreBreakdown.fromJson(Map<String, dynamic> json) {
    return TrustScoreBreakdown(
      clearImagePoints: json['clearImagePoints'] as int,
      exactLocationPoints: json['exactLocationPoints'] as int,
      nearbyReportsPoints: json['nearbyReportsPoints'] as int,
      recentReportPoints: json['recentReportPoints'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
    'clearImagePoints': clearImagePoints,
    'exactLocationPoints': exactLocationPoints,
    'nearbyReportsPoints': nearbyReportsPoints,
    'recentReportPoints': recentReportPoints,
  };
}

/// What the backend hands back after classifying a freshly-submitted photo,
/// before the citizen has approved anything. Every field here is editable by
/// the user on the presubmit screen.
class PresubmitResult {
  PresubmitResult({
    required this.photoPath,
    required this.category,
    required this.severity,
    required this.description,
    required this.location,
    required this.urgencyNote,
    required this.trustScore,
    required this.nearbyDuplicateCount,
    this.photoStorageId,
  });

  final String photoPath;
  IssueCategory category;
  Severity severity;
  String description;
  final GeoPoint location;
  final String urgencyNote;
  final TrustScoreBreakdown trustScore;

  /// The backend's Convex file-storage id for the uploaded photo — set by
  /// [HttpReportApi] once the photo has actually been uploaded, so
  /// `createTicket` can reference it without re-uploading. Null under
  /// [MockReportApi], which never uploads anything.
  final String? photoStorageId;

  /// How many existing tickets this looks like a duplicate of (same
  /// category, within the proximity radius) — surfaced so the citizen knows
  /// their report is reinforcing an existing issue rather than starting a
  /// new one.
  final int nearbyDuplicateCount;
}

class Ticket {
  Ticket({
    required this.id,
    required this.photoPath,
    required this.category,
    required this.severity,
    required this.description,
    required this.location,
    required this.trustScore,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String photoPath;
  final IssueCategory category;
  final Severity severity;
  final String description;
  final GeoPoint location;
  final TrustScoreBreakdown trustScore;
  TicketStatus status;
  final DateTime createdAt;

  String get department => category.department;

  /// Parses a ticket document as returned by the backend's `createTicket`,
  /// `listTickets`, or `getTicket` procedures (see convex/tickets.ts).
  /// [localPhotoPath] fills in the local file path for a ticket this device
  /// just created in this session — the backend only knows the Convex
  /// storage id, not a path on this device. Pass null for tickets loaded
  /// from the server (e.g. via listMyTickets), which have no local photo.
  factory Ticket.fromJson(
    Map<String, dynamic> json, {
    String? localPhotoPath,
  }) {
    return Ticket(
      id: json['_id'] as String,
      photoPath: localPhotoPath ?? '',
      category: IssueCategory.fromApi(json['category'] as String),
      severity: Severity.fromApi(json['severity'] as String),
      description: json['description'] as String,
      location: GeoPoint(
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        accuracyMeters: (json['accuracyMeters'] as num?)?.toDouble(),
      ),
      trustScore: TrustScoreBreakdown.fromJson(
        json['trustScore'] as Map<String, dynamic>,
      ),
      status: TicketStatus.fromApi(json['status'] as String),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        (json['_creationTime'] as num).toInt(),
      ),
    );
  }
}

import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/report.dart';
import 'report_api.dart';

/// Talks to this repo's oRPC backend (src/orpc/router/reports.ts) — the
/// real Genkit/Gemini Vision pipeline instead of [MockReportApi]'s
/// keyword-matching stand-in.
class HttpReportApi implements ReportApi {
  HttpReportApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// How long to keep polling `getDraft` before giving up — the Genkit
  /// pipeline (Gemini call + duplicate check) normally finishes in a few
  /// seconds, but Eventarc delivery adds its own latency on top.
  static const _pollInterval = Duration(milliseconds: 1500);
  static const _maxPollAttempts = 30;

  @override
  Future<PresubmitResult> classifyReport({
    required String photoPath,
    required GeoPoint location,
    required String urgencyNote,
  }) async {
    final created =
        await _call('createDraft', {
              'latitude': location.latitude,
              'longitude': location.longitude,
              if (location.accuracyMeters != null)
                'accuracyMeters': location.accuracyMeters,
              'urgencyNote': urgencyNote,
            })
            as Map<String, dynamic>;
    final draftId = created['draftId'] as String;
    final uploadUrl = created['uploadUrl'] as String;

    // Analysis fires asynchronously (Eventarc watching the GCS bucket) once
    // this PUT lands — not triggered by this call directly.
    final bytes = await File(photoPath).readAsBytes();
    final uploadResponse = await _client.put(
      Uri.parse(uploadUrl),
      headers: {'Content-Type': 'image/jpeg'},
      body: bytes,
    );
    if (uploadResponse.statusCode >= 400) {
      throw ReportApiException(
        'Photo upload failed (${uploadResponse.statusCode}): '
        '${uploadResponse.body}',
      );
    }

    for (var attempt = 0; attempt < _maxPollAttempts; attempt++) {
      await Future<void>.delayed(_pollInterval);
      final draft =
          await _call('getDraft', {'draftId': draftId})
              as Map<String, dynamic>?;
      if (draft == null) {
        throw ReportApiException('Draft $draftId disappeared');
      }

      final status = draft['status'] as String;
      if (status == 'error') {
        throw ReportApiException(
          (draft['errorMessage'] as String?) ?? 'Report analysis failed',
        );
      }
      if (status == 'not_a_civic_issue') {
        throw NotCivicIssueException(
          draft['description'] as String? ??
              "This doesn't look like a civic issue.",
        );
      }
      if (status == 'ready') {
        return PresubmitResult(
          photoPath: photoPath,
          draftId: draftId,
          category: IssueCategory.fromApi(draft['category'] as String),
          severity: Severity.fromApi(draft['severity'] as String),
          description: draft['description'] as String,
          location: location,
          urgencyNote: urgencyNote,
          trustScore: TrustScoreBreakdown.fromJson(
            draft['trustScore'] as Map<String, dynamic>,
          ),
          nearbyDuplicateCount: draft['nearbyDuplicateCount'] as int,
        );
      }
      // status == 'processing' — keep polling.
    }

    throw ReportApiException(
      'Timed out waiting for report analysis to finish',
    );
  }

  @override
  Future<Ticket> createTicket(PresubmitResult presubmit) async {
    final draftId = presubmit.draftId;
    if (draftId == null) {
      throw StateError(
        'createTicket called without a draftId — classifyReport must run '
        'first.',
      );
    }

    final json =
        await _call('createTicket', {
              'photoGcsObjectName': 'reports/$draftId.jpg',
              'category': presubmit.category.apiValue,
              'severity': presubmit.severity.apiValue,
              'description': presubmit.description,
              'urgencyNote': presubmit.urgencyNote,
              'department': presubmit.category.department,
              'latitude': presubmit.location.latitude,
              'longitude': presubmit.location.longitude,
              if (presubmit.location.accuracyMeters != null)
                'accuracyMeters': presubmit.location.accuracyMeters,
              'trustScore': presubmit.trustScore.toJson(),
            })
            as Map<String, dynamic>;

    return Ticket.fromJson(json, localPhotoPath: presubmit.photoPath);
  }

  @override
  Future<List<Ticket>> listMyTickets() async {
    final json = await _call('listTickets', {}) as List<dynamic>;
    return json
        .map((t) => Ticket.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  /// Calls an oRPC procedure at POST /api/rpc/[procedure], using oRPC's
  /// `{"json": ...}` request/response envelope (verified against the
  /// running dev server).
  Future<dynamic> _call(String procedure, Map<String, dynamic> input) async {
    final response = await _client.post(
      Uri.parse('$apiBaseUrl/api/rpc/$procedure'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'json': input}),
    );

    final decoded = jsonDecode(response.body);
    final payload = decoded is Map<String, dynamic> ? decoded['json'] : null;

    if (response.statusCode >= 400) {
      final message = payload is Map<String, dynamic>
          ? payload['message']
          : 'Request failed';
      throw ReportApiException('$procedure failed: $message');
    }
    return payload;
  }
}

class ReportApiException implements Exception {
  ReportApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Thrown when Gemini determines the submitted photo doesn't depict a real
/// civic issue — submission is blocked rather than creating a ticket with a
/// fabricated category. [message] is Gemini's own explanation of what the
/// photo actually shows.
class NotCivicIssueException implements Exception {
  NotCivicIssueException(this.message);

  final String message;

  @override
  String toString() => message;
}

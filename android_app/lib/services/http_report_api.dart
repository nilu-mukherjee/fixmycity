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

  @override
  Future<PresubmitResult> classifyReport({
    required String photoPath,
    required GeoPoint location,
    required String urgencyNote,
  }) async {
    final uploadUrl =
        (await _call('getUploadUrl', {}) as Map<String, dynamic>)['uploadUrl']
            as String;

    final bytes = await File(photoPath).readAsBytes();
    final uploadResponse = await _client.post(
      Uri.parse(uploadUrl),
      headers: {'Content-Type': _guessContentType(photoPath)},
      body: bytes,
    );
    if (uploadResponse.statusCode >= 400) {
      throw ReportApiException(
        'Photo upload failed (${uploadResponse.statusCode}): '
        '${uploadResponse.body}',
      );
    }
    final storageId =
        (jsonDecode(uploadResponse.body)
                as Map<String, dynamic>)['storageId']
            as String;

    final analysis =
        await _call('analyzeReport', {
              'photoStorageId': storageId,
              'latitude': location.latitude,
              'longitude': location.longitude,
              if (location.accuracyMeters != null)
                'accuracyMeters': location.accuracyMeters,
              'urgencyNote': urgencyNote,
            })
            as Map<String, dynamic>;

    return PresubmitResult(
      photoPath: photoPath,
      photoStorageId: storageId,
      category: IssueCategory.fromApi(analysis['category'] as String),
      severity: Severity.fromApi(analysis['severity'] as String),
      description: analysis['description'] as String,
      location: location,
      urgencyNote: urgencyNote,
      trustScore: TrustScoreBreakdown.fromJson(
        analysis['trustScore'] as Map<String, dynamic>,
      ),
      nearbyDuplicateCount: analysis['nearbyDuplicateCount'] as int,
    );
  }

  @override
  Future<Ticket> createTicket(PresubmitResult presubmit) async {
    final photoStorageId = presubmit.photoStorageId;
    if (photoStorageId == null) {
      throw StateError(
        'createTicket called without a photoStorageId — classifyReport '
        'must run first.',
      );
    }

    final json =
        await _call('createTicket', {
              'photoStorageId': photoStorageId,
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

  String _guessContentType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}

class ReportApiException implements Exception {
  ReportApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

import '../models/report.dart';

/// The contract the rest of the app codes against. [MockReportApi] is the
/// only implementation today; swap in an HTTP-backed implementation that
/// calls the Cloud Run/Genkit backend once it exists (see project.md) without
/// touching any screen code.
abstract class ReportApi {
  /// Sends a captured photo + location + free-text urgency note to the
  /// backend's Genkit flow (Gemini Vision → classification → severity →
  /// duplicate check → trust score) and returns an editable presubmit
  /// result. Does not create a ticket yet.
  Future<PresubmitResult> classifyReport({
    required String photoPath,
    required GeoPoint location,
    required String urgencyNote,
  });

  /// Finalizes a ticket from a (possibly user-edited) presubmit result.
  Future<Ticket> createTicket(PresubmitResult presubmit);

  /// Reports submitted by this citizen, most recent first.
  Future<List<Ticket>> listMyTickets();
}

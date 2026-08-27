import 'auth_service.dart';
import 'http_report_api.dart';
import 'report_api.dart';

final AuthService authService = AuthService();

/// Single shared instance screens import directly. Swap this one line back
/// to `MockReportApi()` to demo offline / without a backend (see
/// [ReportApi]).
final ReportApi reportApi = HttpReportApi(authService: authService);

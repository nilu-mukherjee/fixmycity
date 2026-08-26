import 'package:url_launcher/url_launcher.dart';

import '../models/report.dart';

Future<void> openInMaps(GeoPoint location) async {
  final uri = Uri.parse(
    'https://www.google.com/maps?q=${location.latitude},${location.longitude}',
  );
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

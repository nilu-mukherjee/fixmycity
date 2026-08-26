import 'package:flutter_test/flutter_test.dart';

import 'package:fixmycity_app/main.dart';

void main() {
  testWidgets('Home screen shows title and report FAB', (tester) async {
    await tester.pumpWidget(const FixMyCityApp());
    await tester.pumpAndSettle(); // let the mock API's simulated delay resolve.

    expect(find.text('FixMyCity'), findsOneWidget);
    expect(find.text('Report an Issue'), findsOneWidget);
  });
}

// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:stewie/main.dart';

void main() {
  testWidgets('Chat app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const StewieApp());

    // Verify that the app title is displayed.
    expect(find.text('Welcome to Hereco'), findsOneWidget);

    // Verify that the Google login button is present.
    expect(find.text('Continue with Google'), findsOneWidget);

    // Verify that the email toggle button is present.
    expect(find.text('Continue via Email'), findsOneWidget);
  });
}

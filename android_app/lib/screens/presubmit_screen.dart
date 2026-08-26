import 'dart:io';

import 'package:flutter/material.dart';

import '../models/report.dart';
import '../services/service_locator.dart';
import '../utils/maps.dart';
import '../widgets/trust_score_card.dart';
import 'ticket_detail_screen.dart';

/// Step 2 of the citizen flow: the AI's classification comes back as an
/// editable "presubmit" — category, severity, and description can all be
/// corrected before a ticket is created (project.md: "Create a presubmit
/// data to user (can edit) and once approve, it create the ticket.").
class PresubmitScreen extends StatefulWidget {
  const PresubmitScreen({super.key, required this.presubmit});

  final PresubmitResult presubmit;

  @override
  State<PresubmitScreen> createState() => _PresubmitScreenState();
}

class _PresubmitScreenState extends State<PresubmitScreen> {
  late IssueCategory _category;
  late Severity _severity;
  late final TextEditingController _descriptionController;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _category = widget.presubmit.category;
    _severity = widget.presubmit.severity;
    _descriptionController = TextEditingController(text: widget.presubmit.description);
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _approve() async {
    setState(() => _submitting = true);
    widget.presubmit.category = _category;
    widget.presubmit.severity = _severity;
    widget.presubmit.description = _descriptionController.text.trim();

    // Captured before the await: once the ticket is created we pop back to
    // Home (through CaptureScreen, which is what triggers HomeScreen's
    // _refresh()) before pushing the detail screen — using `context` after
    // popping would be unsafe since this widget gets unmounted by then.
    final navigator = Navigator.of(context);

    try {
      final ticket = await reportApi.createTicket(widget.presubmit);
      if (!mounted) return;
      navigator.popUntil((route) => route.isFirst);
      navigator.push(
        MaterialPageRoute(builder: (_) => TicketDetailScreen(ticket: ticket)),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final presubmit = widget.presubmit;

    return Scaffold(
      appBar: AppBar(title: const Text('Review Before Submitting')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.file(File(presubmit.photoPath), fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 16),
          if (presubmit.nearbyDuplicateCount > 0)
            Card(
              color: Theme.of(context).colorScheme.secondaryContainer,
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.groups_outlined),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${presubmit.nearbyDuplicateCount} nearby report(s) look like '
                        'the same issue — this will reinforce that ticket instead of '
                        'creating a duplicate.',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          Text('AI Classification', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          DropdownButtonFormField<IssueCategory>(
            initialValue: _category,
            decoration: const InputDecoration(
              labelText: 'Category',
              border: OutlineInputBorder(),
            ),
            items: [
              for (final category in IssueCategory.values)
                DropdownMenuItem(value: category, child: Text(category.label)),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _category = value);
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<Severity>(
            initialValue: _severity,
            decoration: const InputDecoration(
              labelText: 'Severity',
              border: OutlineInputBorder(),
            ),
            items: [
              for (final severity in Severity.values)
                DropdownMenuItem(value: severity, child: Text(severity.label)),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _severity = value);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Description',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.business_outlined),
            title: Text(_category.department),
            subtitle: const Text('Routed department (mocked, no real municipal integration)'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.location_on_outlined),
            title: Text(
              '${presubmit.location.latitude.toStringAsFixed(5)}, '
              '${presubmit.location.longitude.toStringAsFixed(5)}',
            ),
            subtitle: Text(
              presubmit.location.accuracyMeters == null
                  ? 'Accuracy unknown'
                  : '±${presubmit.location.accuracyMeters!.toStringAsFixed(0)}m accuracy',
            ),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: () => openInMaps(presubmit.location),
          ),
          const SizedBox(height: 16),
          TrustScoreCard(score: presubmit.trustScore),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _submitting ? null : _approve,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(_submitting ? 'Creating Ticket…' : 'Approve & Create Ticket'),
          ),
        ],
      ),
    );
  }
}

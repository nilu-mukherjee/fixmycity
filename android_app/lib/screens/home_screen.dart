import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/report.dart';
import '../services/service_locator.dart';
import '../widgets/severity_chip.dart';
import 'capture_screen.dart';
import 'ticket_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Ticket>> _ticketsFuture;

  @override
  void initState() {
    super.initState();
    _ticketsFuture = reportApi.listMyTickets();
  }

  void _refresh() {
    setState(() {
      _ticketsFuture = reportApi.listMyTickets();
    });
  }

  Future<void> _openCapture() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CaptureScreen()),
    );
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/images/icon.png', width: 28, height: 28),
            const SizedBox(width: 10),
            const Text('FixMyCity'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<Ticket>>(
          future: _ticketsFuture,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ListView(
                children: [
                  const SizedBox(height: 120),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Could not load your reports: ${snapshot.error}',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final tickets = snapshot.data!;
            if (tickets.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('No reports yet. Tap + to report an issue.')),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: tickets.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final ticket = tickets[index];
                return _TicketTile(ticket: ticket);
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCapture,
        icon: const Icon(Icons.add_a_photo_outlined),
        label: const Text('Report an Issue'),
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket});

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => TicketDetailScreen(ticket: ticket)),
          );
        },
        title: Text(ticket.category.label),
        subtitle: Text(
          '${ticket.status.label} · ${ticket.department}\n'
          '${DateFormat.yMMMd().format(ticket.createdAt)} · '
          'Trust ${ticket.trustScore.total}/100',
        ),
        isThreeLine: true,
        trailing: SeverityChip(severity: ticket.severity),
      ),
    );
  }
}

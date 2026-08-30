import { writeFileSync } from 'node:fs'

import { prisma } from '#/db'
import { getPublicUrl } from '#/gcs/url'
import { runReportPipeline } from '#/genkit/report-flow'

const backupPath = process.argv[2]
if (!backupPath) throw new Error('usage: reclassify-tickets.ts <backup.json>')

const tickets = await prisma.ticket.findMany({
  orderBy: { ticketNumber: 'asc' },
})

writeFileSync(
  backupPath,
  JSON.stringify(
    tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      issueLabel: t.issueLabel,
      aiCategory: t.aiCategory,
      aiSeverity: t.aiSeverity,
      aiDescription: t.aiDescription,
    })),
    null,
    2,
  ),
)
console.log(`backed up ${tickets.length} tickets -> ${backupPath}\n`)

for (const t of tickets) {
  const label = `FMC${String(t.ticketNumber).padStart(3, '0')}`
  try {
    const result = await runReportPipeline({
      photoUrl: getPublicUrl(t.photoGcsObjectName),
      latitude: t.latitude,
      longitude: t.longitude,
      accuracyMeters: t.accuracyMeters ?? undefined,
      urgencyNote: t.urgencyNote,
    })

    if (!result.isCivicIssue) {
      console.log(`${label}: SKIPPED — model says not a civic issue`)
      continue
    }

    await prisma.ticket.update({
      where: { id: t.id },
      data: {
        issueLabel: result.issueLabel,
        aiCategory: result.category,
        aiSeverity: result.severity,
        aiDescription: result.description,
      },
    })

    console.log(
      `${label}: ${result.issueLabel} | ai=${result.category}/${result.severity} ` +
        `(citizen kept ${t.category}/${t.severity})`,
    )
  } catch (error) {
    console.log(`${label}: FAILED — ${(error as Error).message}`)
  }
}

await prisma.$disconnect()

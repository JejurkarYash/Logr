export function calculateStreak(rows: { date: string; completed: boolean }[]): number {
    if (!rows || rows.length === 0) return 0

    let streak = 0
    const today = new Date()

    for (let i = 0; i < rows.length; i++) {
        // What date do we expect at position i?
        // i=0 → today, i=1 → yesterday, i=2 → day before, etc.
        const expectedDate = new Date(today)
        expectedDate.setDate(today.getDate() - i)
        const expectedDateStr = expectedDate.toISOString().split('T')[0]

        const row = rows[i]

        // If this row's date doesn't match expected date → gap in streak → stop
        if (row.date !== expectedDateStr) break

        // If this day was not completed → streak breaks
        if (!row.completed) break

        // All good — count this day
        streak++
    }

    return streak
}
// ─────────────────────────────────────────
// Helper — Get current week range (Mon–Sun)
// ─────────────────────────────────────────
export function getCurrentWeekRange() {
    const today = new Date()

    // getDay() returns 0=Sun, 1=Mon ... 6=Sat
    // We want week to start on Monday
    const dayOfWeek = today.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    // if today is Sunday (0) → go back 6 days to get Monday
    // if today is Monday (1) → diff is 0
    // if today is Wednesday (3) → diff is -2

    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
    }
}


// ─────────────────────────────────────────
// Helper — Get current month range
// ─────────────────────────────────────────
export function getCurrentMonthRange() {
    const today = new Date()

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    // month + 1, day 0 = last day of current month

    return {
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
    }
}


// ─────────────────────────────────────────
// Helper — Build 7 day slots Mon to Sun
// Fills in 0s for days with no log entry
// ─────────────────────────────────────────
export function buildWeekDays(
    weekStart: string,
    logs: {
        date: string
        day_type?: string
        saas_hours?: number
        oss_hours?: number
        profile_hours?: number
        win?: string
        blocker?: string
    }[]
) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Convert logs array to a map keyed by date for O(1) lookup
    // { "2026-05-05": { saas_hours: 3, ... }, ... }
    const logMap = new Map(logs.map(log => [log.date, log]))

    return dayNames.map((dayName, index) => {
        // Calculate the actual date for this day slot
        const date = new Date(weekStart)
        date.setDate(date.getDate() + index)
        const dateStr = date.toISOString().split('T')[0]

        // Find the log for this date if it exists
        const log = logMap.get(dateStr)

        return {
            day: dayName,           // "Mon"
            date: dateStr,          // "2026-04-28"
            saas_hours: log?.saas_hours ?? 0,
            oss_hours: log?.oss_hours ?? 0,
            profile_hours: log?.profile_hours ?? 0,
            total_hours: roundHours(
                (log?.saas_hours ?? 0) +
                (log?.oss_hours ?? 0) +
                (log?.profile_hours ?? 0)
            ),
            logged: !!log,          // true if user logged this day, false if empty slot
            day_type: log?.day_type ?? null,
            win: log?.win ?? null,
            blocker: log?.blocker ?? null,
        }
    })
}


export function roundHours(hours: number): number {
    return Math.round(hours * 10) / 10
}

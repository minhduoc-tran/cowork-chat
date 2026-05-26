export function formatEstimate(value: number | null | undefined, unit: "minutes" | "hours" | "days" | string | null | undefined): string {
  if (value === null || value === undefined || !unit) return ""
  
  switch (unit) {
    case "minutes":
      return `${value}m`
    case "hours":
      return `${value}h`
    case "days":
      return `${value}d`
    default:
      return `${value}`
  }
}

export function getEstimateUnitLabel(unit: "minutes" | "hours" | "days" | string | null | undefined, t?: (key: string, defaultValue: string) => string): string {
  const translate = t || ((_: string, def: string) => def)
  switch (unit) {
    case "minutes":
      return translate("tasks.unitMinutes", "phút")
    case "hours":
      return translate("tasks.unitHours", "giờ")
    case "days":
      return translate("tasks.unitDays", "ngày")
    default:
      return ""
  }
}

"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import { cn } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/input"

import { useFilterContext } from "../provider/filter-context"

import { FilterRoot } from "./filter-root"

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  hideSearch?: boolean
  /**
   * Defines the layout order: "search-filters" or "filters-search"
   * @default "search-filters"
   */
  layout?: "search-filters" | "filters-search"
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      className,
      searchPlaceholder = "Search...",
      searchValue: externalSearchValue,
      onSearchChange,
      hideSearch = false,
      layout = "search-filters",
      ...props
    },
    ref
  ) => {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [searchParams] = useSearchParams()
    const { config } = useFilterContext()

    const searchParamName = config.searchParamName || "q"
    const internalSearchValue = searchParams.get(searchParamName) || ""

    const [localValue, setLocalValue] = React.useState(
      externalSearchValue !== undefined
        ? externalSearchValue
        : internalSearchValue
    )

    const [, startTransition] = React.useTransition()
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync external changes (e.g. from clear filters) back into local state
    React.useEffect(() => {
      if (externalSearchValue !== undefined) {
        setLocalValue(externalSearchValue)
      } else {
        setLocalValue(internalSearchValue)
      }
    }, [externalSearchValue, internalSearchValue])

    const handleSearchChange = (value: string) => {
      if (onSearchChange) {
        onSearchChange(value)
        return
      }

      setLocalValue(value)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set(searchParamName, value)
        } else {
          params.delete(searchParamName)
        }
        const queryStr = params.toString()
        const newPath = queryStr ? `${pathname}?${queryStr}` : pathname

        startTransition(() => {
          navigate(newPath, { replace: true })
        })
      }, 300)
    }

    const searchComponent = !hideSearch && (
      <div className="max-w-sm flex-1">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            className="pl-8"
            value={localValue}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>
    )

    const filtersComponent = (
      <div className="flex items-center gap-2">
        <FilterRoot />
      </div>
    )

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between gap-4", className)}
        {...props}
      >
        {layout === "filters-search" ? (
          <>
            {filtersComponent}
            {searchComponent}
          </>
        ) : (
          <>
            {searchComponent}
            {filtersComponent}
          </>
        )}
      </div>
    )
  }
)
FilterBar.displayName = "FilterBar"

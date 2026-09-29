'use client'

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

type Props = { label: string; options: string[]; selected: string[]; onChange: (next: string[]) => void }

export function FacetFilter({ label, options, selected, onChange }: Props) {
  const toggle = (opt: string, on: boolean) =>
    onChange(on ? [...selected, opt] : selected.filter((s) => s !== opt))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        {label}{selected.length > 0 && ` (${selected.length})`}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((opt) => (
          <DropdownMenuCheckboxItem key={opt} checked={selected.includes(opt)}
            onCheckedChange={(on) => toggle(opt, on)} className="capitalize">
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

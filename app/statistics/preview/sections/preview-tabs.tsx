"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Pair = [string, string]
export type TabGroup = { value: string; label: string; items: { value: string; label: string }[] }

// State shared across tabs, so a click in one (a cell of the head-to-head grid) can open another
// (Rivalries) on the right pair.
const PreviewContext = React.createContext<{
  rivalry: Pair
  setRivalry: (pair: Pair) => void
  openRivalry: (a: string, b: string) => void
} | null>(null)

export function usePreview() {
  const context = React.useContext(PreviewContext)
  if (!context) throw new Error("usePreview must be used inside PreviewTabs")
  return context
}

// Two levels: a group, then one of the group's views. A group with a single view skips the second
// row. Each group remembers its last view.
export function PreviewTabs({ groups, panels }: { groups: TabGroup[]; panels: Record<string, React.ReactNode> }) {
  const [group, setGroup] = React.useState(groups[0].value)
  const [views, setViews] = React.useState(() => Object.fromEntries(groups.map((g) => [g.value, g.items[0].value])))
  const [rivalry, setRivalry] = React.useState<Pair>(["Logan", "Andy"])
  const root = React.useRef<HTMLDivElement>(null)

  const show = (view: string) => {
    const owner = groups.find((g) => g.items.some((i) => i.value === view))!
    setGroup(owner.value)
    setViews((v) => ({ ...v, [owner.value]: view }))
  }
  const openRivalry = (a: string, b: string) => {
    setRivalry([a, b])
    show("rivalries")
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <PreviewContext.Provider value={{ rivalry, setRivalry, openRivalry }}>
      <div ref={root} className="scroll-mt-20">
        <Tabs value={group} onValueChange={(v) => setGroup(String(v))}>
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <TabsList className="w-max">
              {groups.map((g) => (
                <TabsTrigger key={g.value} value={g.value}>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {groups.map((g) => (
            <TabsContent key={g.value} value={g.value} className="pt-2">
              {g.items.length === 1 ? (
                panels[g.items[0].value]
              ) : (
                <Tabs value={views[g.value]} onValueChange={(v) => setViews((s) => ({ ...s, [g.value]: String(v) }))}>
                  <div className="-mx-4 overflow-x-auto px-4 pb-1">
                    <TabsList variant="line" className="w-max">
                      {g.items.map((i) => (
                        <TabsTrigger key={i.value} value={i.value}>
                          {i.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {g.items.map((i) => (
                    <TabsContent key={i.value} value={i.value} className="pt-2">
                      {panels[i.value]}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PreviewContext.Provider>
  )
}

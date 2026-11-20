import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { safePath } from "@/lib/forms"
import { editorLogin } from "./actions"

export const metadata: Metadata = { title: "Editor login" }

// Unlocks editing across the site: Andy Schefter tweets, power ranking write-ups, the slander gallery
export default async function EditorLoginPage({ searchParams }: { searchParams: Promise<{ from?: string; error?: string }> }) {
  const { from, error } = await searchParams

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Editor login</CardTitle>
          <CardDescription>
            Enter the editor password to post Andy Schefter tweets, write power rankings, and add to the slander gallery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={editorLogin} className="flex flex-col gap-3">
            <input type="hidden" name="from" value={safePath(from)} />
            <Input
              type="password"
              name="password"
              placeholder="Editor password"
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              autoFocus
              required
            />
            {error && <p className="text-sm text-destructive">Wrong password.</p>}
            <Button type="submit">Enter</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { posterLogin } from "../actions"

export const metadata: Metadata = { title: "Post as Andy" }

export default async function PosterLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Post as Andy</CardTitle>
          <CardDescription>Enter the poster password to write Andy Schefter tweets.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={posterLogin} className="flex flex-col gap-3">
            <Input
              type="password"
              name="password"
              placeholder="Poster password"
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

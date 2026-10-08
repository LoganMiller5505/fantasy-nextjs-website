import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { login } from "./actions"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>
}) {
  const { from, error } = await searchParams

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Members only</CardTitle>
          <CardDescription>Enter the league password to get into the Huddle.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-3">
            <input type="hidden" name="from" value={from ?? "/"} />
            <Input
              type="password"
              name="password"
              placeholder="Password"
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

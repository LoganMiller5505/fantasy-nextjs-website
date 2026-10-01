import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PowerRankInfo = { name: string; alias: string; newRank: number; oldRank?: number; logoPath: string; description: string }

function RankChange({ newRank, oldRank }: { newRank: number; oldRank?: number }) {
    const delta = oldRank == null ? 0 : oldRank - newRank;
    if (delta > 0) {
        return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400"><ArrowUp />+{delta}</Badge>;
    }
    if (delta < 0) {
        return <Badge variant="destructive"><ArrowDown />{delta}</Badge>;
    }
    return <Badge variant="secondary"><Minus />0</Badge>;
}

export function PowerRank({ name, alias, newRank, oldRank, logoPath, description }: PowerRankInfo) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                        <AvatarImage src={logoPath} alt={`${alias} logo`} />
                        <AvatarFallback>{name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg">
                            <span className="text-muted-foreground tabular-nums">#{newRank}</span> {name}
                        </CardTitle>
                        <CardDescription>{alias}</CardDescription>
                    </div>
                </div>
                <CardAction>
                    <RankChange newRank={newRank} oldRank={oldRank} />
                </CardAction>
            </CardHeader>
            <CardContent className="text-base">
                {description}
                {oldRank != null && <span className="block text-sm text-muted-foreground">Last week: #{oldRank}</span>}
            </CardContent>
        </Card>
    )
}

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Author, PowerRankInfo } from "@/lib/power-rankings";

function RankChange({ newRank, oldRank }: { newRank: number; oldRank?: number }) {
    const delta = oldRank == null ? 0 : oldRank - newRank;
    if (delta > 0) {
        return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400"><ArrowUp />+{delta}</Badge>;
    }
    if (delta < 0) {
        return <Badge variant="destructive"><ArrowDown />{delta}</Badge>;
    }
    return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"><Minus />0</Badge>;
}

export function PowerRank({ name, alias, newRank, oldRank, record, logoPath, description, loganDescription, andyDescription, author }: PowerRankInfo & { author: Author }) {
    const text = (author === 'andy' ? andyDescription : loganDescription) ?? description;
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
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="tabular-nums">{record}</Badge>
                        <RankChange newRank={newRank} oldRank={oldRank} />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="text-base">
                {text}
                {oldRank != null && <span className="block text-sm text-muted-foreground">Last week: #{oldRank}</span>}
            </CardContent>
        </Card>
    )
}

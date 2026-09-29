import Image from "next/image";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

type PowerRankInfo = { name: string; alias: string; newRank: number; oldRank: number; logoPath: string; description: string }


export function PowerRank({ name, alias, newRank, oldRank, logoPath, description }: PowerRankInfo) {
    return (
        <div>
            <article className="space-y-2 rounded-lg border border-border p-4">
                <h3 className="inline-block">
                    #{newRank}
                    { oldRank == null || oldRank == undefined || oldRank == newRank ? (
                        <div className =" inline-block">
                            <Minus className="inline-block h-5 w-5 text-gray-500" />
                            <h4 className="inline-block text-gray-500">
                                (0)
                            </h4>
                        </div>
                    ) : newRank > oldRank ? (
                        <div className =" inline-block">
                            <ArrowDown className="inline-block h-5 w-5 text-red-500" />
                            <h4 className="inline-block text-red-500">
                                ({oldRank - newRank})
                            </h4>
                        </div>
                    ) : newRank < oldRank ? (
                        <div className =" inline-block">
                            <ArrowUp className="inline-block h-5 w-5 text-green-500" />
                            <h4 className="inline-block text-green-500">
                                (+{oldRank - newRank})
                            </h4>
                        </div>
                    ) : null}
                </h3>
                
                <h3>{name} ({alias})</h3>
                <p>Last Week: {oldRank}</p>
                <p>{description}</p>
                <Image src={logoPath} alt={`${alias} logo`} width={64} height={64} />
            </article>
        </div>
    )
}
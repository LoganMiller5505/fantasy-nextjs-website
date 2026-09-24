import Image from "next/image";

type BioInfo = { name: string; alias: string; title?: string; logoPath: string; description: string; yearsPlayed: string; }


export function Bio({ name, alias, title, logoPath, description, yearsPlayed }: BioInfo) {
    return (
        <article className="space-y-2 rounded-lg border border-border p-4">
            <h3>{name} ({alias})</h3>
            {title && <p>{title}</p>}
            <Image src={logoPath} alt={`${alias} logo`} width={64} height={64} />
            <p className="text-lg">{description}</p>
            <p className="text-lg">Years Played: {yearsPlayed}</p>
        </article>
    )
}
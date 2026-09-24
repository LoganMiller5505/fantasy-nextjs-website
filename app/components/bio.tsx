type BioInfo = { name: string; alias: string; title?: string; logoPath: string; description: string; yearsPlayed: string; }

export function Bio({ name, alias, title, logoPath, description, yearsPlayed }: BioInfo) {
    return (
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">{name} ({alias})</h3>
            {title && <h4 className="text-lg font-medium">{title}</h4>}
            <img src={logoPath} className="w-16 h-16" />
            <p className="text-lg">{description}</p>
            <p className="text-lg">Years Played: {yearsPlayed}</p>
        </div>
    )
}
type VideoProps = { filepath: string; title: string; className?: string };

export function Video({ filepath, title, className }: VideoProps) {
    return (
        <iframe
            src={filepath}
            title={title}
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className={`aspect-video w-full ${className || ''}`}
        />
    )
}

type VideoProps = { id: string; title: string; className?: string };

export function Video({ id, title, className }: VideoProps) {
    return (
        <iframe
            src={`https://player.vimeo.com/video/${id}?badge=0&autopause=0`}
            title={title}
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className={`aspect-video w-full ${className || ''}`}
        />
    )
}

import { GALLERY } from "@/lib/gallery";
import { GalleryView } from "./gallery-view";

export default function SlanderGalleryPage() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Slander Gallery</h1>
            <GalleryView items={GALLERY} />
        </div>
    );
}

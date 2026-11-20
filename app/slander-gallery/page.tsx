import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { isEditor } from "@/lib/editor";
import { getGallery, getManagerNames } from "@/lib/gallery";
import { UndoDeleteProvider } from "../_components/undo-delete";
import { editorLogout } from "../editor/actions";
import { restoreGalleryItem } from "./actions";
import { GalleryView } from "./gallery-view";

export const metadata: Metadata = { title: "Slander Gallery" };

export default async function SlanderGalleryPage() {
    // Rendered per request: the gallery changes whenever an editor adds to it
    await connection();
    const [items, editor] = await Promise.all([getGallery(), isEditor()]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Slander Gallery</h1>
            {editor ? (
                <UndoDeleteProvider restore={restoreGalleryItem} label="Removed from the gallery">
                    <GalleryView items={items} managers={await getManagerNames()} />
                </UndoDeleteProvider>
            ) : (
                <GalleryView items={items} />
            )}
            <div className="py-4 text-center text-sm text-muted-foreground">
                {editor ? (
                    <form action={editorLogout}>
                        <button type="submit" className="hover:text-foreground hover:underline">Log out of editing</button>
                    </form>
                ) : (
                    <Link href="/editor?from=/slander-gallery" className="hover:text-foreground hover:underline">Add to the gallery</Link>
                )}
            </div>
        </div>
    );
}

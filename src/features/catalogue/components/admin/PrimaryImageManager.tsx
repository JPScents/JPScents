"use client";

import Image from "next/image";
import { useActionState } from "react";
import { removePrimaryImage, savePrimaryImage, type ImageActionState } from "../../actions/image.admin.action";

const initial: ImageActionState = {};

export function PrimaryImageManager({ perfumeId, image }: { perfumeId: string; image?: { path: string; altText: string; signedUrl?: string } }) {
  const [state, action, pending] = useActionState(savePrimaryImage, initial); const [removeState, removeAction, removing] = useActionState(removePrimaryImage, initial);
  return <section className="mt-4"><p className="text-sm text-jp-text-secondary">JPEG, PNG, or WebP. Maximum 5 MiB. Private images are rendered through an authorized signed URL.</p><div className="mt-5 grid gap-5 md:grid-cols-[11rem_1fr]"><div className="flex min-h-48 items-center justify-center border border-dashed bg-jp-stone p-3">{image?.signedUrl ? <Image unoptimized width={352} height={352} className="max-h-44 max-w-full object-contain" src={image.signedUrl} alt={image.altText} /> : <span className="text-center text-sm text-jp-text-secondary">No primary image</span>}</div><div><form action={action} className="grid gap-3"><input type="hidden" name="perfumeId" value={perfumeId} /><label className="grid gap-1 text-sm font-medium">Image file<span className="font-normal text-jp-text-secondary">JPEG, PNG, or WebP</span><input required name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></label><label className="grid gap-1 text-sm font-medium">Alt text<input required name="altText" defaultValue={image?.altText} className="h-10 border bg-white px-3" /></label><button disabled={pending} className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white" type="submit">{pending ? "Uploading…" : image ? "Replace image" : "Upload image"}</button></form>{image ? <form action={removeAction} className="mt-3"><input type="hidden" name="perfumeId" value={perfumeId} /><button disabled={removing} className="text-sm text-destructive underline" type="submit">Remove image</button></form> : null}{state.error || removeState.error ? <p role="alert" className="mt-3 text-sm text-destructive">{state.error ?? removeState.error}</p> : null}{state.ok ? <p className="mt-3 text-sm text-jp-status-confirmed-foreground">Image saved.</p> : null}</div></div></section>;
}

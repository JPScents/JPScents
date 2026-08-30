"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  removePrimaryImage,
  type RemovePrimaryImageState,
} from "../../actions/remove-primary-image.admin.action";
import {
  savePrimaryImage,
  type SavePrimaryImageState,
} from "../../actions/save-primary-image.admin.action";

const initial: SavePrimaryImageState & RemovePrimaryImageState = {};

export function PrimaryImageManager({
  perfumeId,
  image,
}: {
  perfumeId: string;
  image?: { path: string; altText: string; signedUrl?: string };
}) {
  const [state, action, pending] = useActionState(savePrimaryImage, initial);
  const [removeState, removeAction, removing] = useActionState(removePrimaryImage, initial);
  return (
    <section className="mt-4 space-y-3">
      <div className="flex aspect-square items-center justify-center border border-dashed border-jp-admin-border bg-jp-stone p-3">
        {image?.signedUrl ? (
          <Image
            unoptimized
            width={352}
            height={352}
            className="h-full w-full object-contain"
            src={image.signedUrl}
            alt={image.altText}
          />
        ) : (
          <span className="px-4 text-center text-sm text-jp-text-secondary">
            {image ? "Image preview unavailable" : "No primary image"}
          </span>
        )}
      </div>
      <p className="text-sm text-jp-text-secondary">
        JPEG, PNG, or WebP. Maximum 5 MiB. Replacing the image updates catalogue cards immediately.
      </p>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="perfumeId" value={perfumeId} />
        <div className="grid gap-1 text-sm font-medium">
          <span>
            Image file{" "}
            <span className="font-normal text-jp-text-secondary">JPEG, PNG, WebP · 5 MiB max</span>
          </span>
          <input
            className="sr-only"
            id={`primary-image-${perfumeId}`}
            required
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          <label
            className="flex h-10 cursor-pointer items-center justify-center border border-jp-text-primary bg-[#fbf9f4] px-3 text-sm font-semibold text-jp-text-primary hover:bg-jp-stone focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jp-admin-action"
            htmlFor={`primary-image-${perfumeId}`}
          >
            {image ? "Choose replacement image" : "Upload image"}
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Alt text
          <input
            required
            name="altText"
            defaultValue={image?.altText}
            className="h-10 border bg-white px-3"
          />
        </label>
        <button
          disabled={pending}
          className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white"
          type="submit"
        >
          {pending ? "Uploading…" : image ? "Replace image" : "Upload image"}
        </button>
      </form>
      {image ? (
        <form action={removeAction}>
          <input type="hidden" name="perfumeId" value={perfumeId} />
          <button disabled={removing} className="text-sm text-destructive underline" type="submit">
            Remove image
          </button>
        </form>
      ) : null}
      {state.error || removeState.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error ?? removeState.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-jp-status-confirmed-foreground">Image saved.</p>
      ) : null}
    </section>
  );
}

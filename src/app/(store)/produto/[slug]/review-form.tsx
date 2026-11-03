"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/app/actions/store";
import { Form, Field, FormMessage, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, existing }: { productId: string; existing: { rating: number; comment: string } | null }) {
  const [state, action] = useActionState<ActionState, FormData>(submitReviewAction, {});
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [hover, setHover] = useState(0);
  const fe = state.fieldErrors ?? {};

  return (
    <Form action={action} className="space-y-3" noValidate>
      <p className="text-sm font-medium">{existing ? "Editar sua avaliação" : "Avalie este produto"}</p>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} estrela(s)`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star className={cn("h-5 w-5 transition-colors", n <= (hover || rating) ? "fill-fg text-fg" : "text-line-strong")} />
          </button>
        ))}
      </div>
      <Field name="comment" error={fe.comment}>
        <Textarea name="comment" defaultValue={existing?.comment} placeholder="Conte como foi sua experiência..." maxLength={1000} invalid={!!fe.comment} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="sm" pendingText="Enviando...">{existing ? "Atualizar avaliação" : "Publicar avaliação"}</SubmitButton>
    </Form>
  );
}

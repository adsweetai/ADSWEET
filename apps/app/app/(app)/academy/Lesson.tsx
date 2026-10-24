"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@adsweet/ui";
import type { LessonVM } from "@/lib/server/academy";
import { markReadAction } from "./actions";

/** De controlevraag. Een juist antwoord telt als gelezen. */
export function Quiz({ lesson, quiz }: { lesson: string; quiz: NonNullable<LessonVM["quiz"]> }) {
  const t = useTranslations("academy");
  const [pick, setPick] = useState<string | null>(null);
  const [, start] = useTransition();
  const right = pick === quiz.right;
  return (
    <fieldset className="ls-quiz">
      <legend>{t("quizLegend")}</legend>
      <b id={`q-${lesson}`}>{quiz.q}</b>
      <div role="radiogroup" aria-labelledby={`q-${lesson}`} className="ls-quiz__options">
        {quiz.options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pick === id}
            className="ls-option"
            onClick={() => {
              setPick(id);
              if (id === quiz.right) start(() => markReadAction(lesson));
            }}
          >
            <span className="ls-option__dot" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {pick ? (
        <p role="status" className={right ? "ls-fb ls-fb--ok" : "ls-fb ls-fb--act"}>
          {right ? quiz.yes : quiz.no}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Onderaan: gelezen, en door naar de volgende les (of terug naar de Academy). */
export function MarkRead({ lesson, next, read }: { lesson: string; next: string | null; read: boolean }) {
  const t = useTranslations("academy");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="ls-foot">
      {read ? <span className="as-muted">{t("isRead")}</span> : null}
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markReadAction(lesson);
            router.push(next ? `/academy/${next}` : "/academy");
          })
        }
      >
        {next ? t("markRead") : t("markReadLast")}
      </Button>
    </div>
  );
}

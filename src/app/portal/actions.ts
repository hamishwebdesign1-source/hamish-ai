"use server";

import { answerQuestion } from "@/lib/answer-question";
import { isRateLimited } from "@/lib/chat-rate-limit";

export type AskState = { answer?: string; error?: string };

export async function askQuestion(clientId: string, _prevState: AskState, formData: FormData): Promise<AskState> {
  const question = String(formData.get("question") || "").trim();
  if (!question) return {};

  if (isRateLimited(`portal-ask:${clientId}`)) {
    return { error: "Too many questions in a short time — try again in a few minutes." };
  }

  const result = await answerQuestion(clientId, question);
  if ("error" in result) return { error: result.error };
  return { answer: result.answer };
}

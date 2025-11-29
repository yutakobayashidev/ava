import { createOpenAI as _createAiSdkOpenAI } from "@ai-sdk/openai";
import { LanguageModelV2 } from "@ai-sdk/provider";
import { generateText as aisdkGenerateText } from "ai";

export const createOpenAI = (ctx: { env: { OPENAI_API_KEY: string } }) => {
  return _createAiSdkOpenAI({
    apiKey: ctx.env.OPENAI_API_KEY,
  });
};

export type GenerateTextParams = Omit<
  Parameters<typeof aisdkGenerateText>[0],
  "model" | "experimental_output"
>;

export const generateText =
  (model: LanguageModelV2) => async (prompt: string) => {
    const response = await aisdkGenerateText({
      model,
      prompt,
    });

    return response;
  };

export const createAiSdkModels = (ctx: {
  env: { OPENAI_API_KEY: string };
}) => ({
  openai: createOpenAI(ctx),
});

export type AiSdkModels = ReturnType<typeof createAiSdkModels>;

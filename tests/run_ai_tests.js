import { callModel } from "../src/backend/ai/core.js";
import { AIfunction } from "../src/backend/ai/index.js";

(async () => {
  const env = {
    AI_AVAILABLE_MODELS: JSON.stringify(["mock-model","openai/gpt-4o-mini"]),
    AI_MODEL_CONSUMPTION: JSON.stringify({"mock-model":"0 units (mock)","openai/gpt-4o-mini":"~100 tokens per req"}),
    DEFAULT_AI_MODEL: "mock-model",
  };

  console.log('--- Test callModel (mock) ---');
  const res1 = await callModel(env, 'mock-model', 'Salut, peux-tu résumer ceci ?');
  console.log('callModel(mock-model) =>', res1);

  console.log('\n--- Test AIfunction categories ---');
  const res2 = await AIfunction(env, 'categories', 'GET', null, null);
  console.log('AIfunction(categories) =>', JSON.stringify(res2, null, 2));
})();

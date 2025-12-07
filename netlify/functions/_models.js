// List of models you want to compare side by side
// You can change labels or models later.

const MODELS = [
  {
    id: "mistral",
    label: "Mistral 7B Instruct",
    provider: "huggingface",
    modelName: "mistralai/Mistral-7B-Instruct-v0.3",
  },
  {
    id: "gemma",
    label: "Gemma 2B It",
    provider: "huggingface",
    modelName: "google/gemma-2-2b-it",
  },
  {
    id: "phi",
    label: "Phi-3 Mini (HF)",
    provider: "huggingface",
    modelName: "microsoft/phi-3-mini-4k-instruct",
  },
];

module.exports = { MODELS };

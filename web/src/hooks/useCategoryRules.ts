import { useCategoriesStore } from "../store";

export function useCategoryRules() {
  const { manualRules, setManualRules, drafts, setDrafts, categoryDefinitions, setCategoryDefinitions } =
    useCategoriesStore();
  return { manualRules, setManualRules, drafts, setDrafts, categoryDefinitions, setCategoryDefinitions };
}

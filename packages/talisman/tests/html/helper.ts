import { AllowedValue } from "@grimoire/rune";

export function asDocument(val: AllowedValue): Document {
  return val as unknown as Document;
}

import type { SecretField } from "../../gen/types.ts";
import { type FieldView } from "./_view.ts";
export declare const secret: FieldView<Omit<SecretField, "value">>;

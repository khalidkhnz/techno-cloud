"use client";

import type { TargetConfigField } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ConfigValue = string | number | boolean;

/** Renders a target's config schema as a form; conditional fields honor `showIf`. */
export function TargetConfigForm({
  schema,
  values,
  onChange,
}: {
  schema: TargetConfigField[];
  values: Record<string, ConfigValue>;
  onChange: (key: string, value: ConfigValue) => void;
}) {
  const visible = schema.filter(
    (f) => !f.showIf || String(values[f.showIf.key] ?? "") === f.showIf.equals,
  );

  if (visible.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visible.map((f) => (
        <div key={f.key} className={f.type === "boolean" ? "sm:col-span-2" : undefined}>
          <Field field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
        </div>
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: TargetConfigField;
  value: ConfigValue | undefined;
  onChange: (v: ConfigValue) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="accent-[hsl(var(--primary))]"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {field.label}
        {field.unit ? ` (${field.unit})` : ""}
      </Label>

      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field.type === "number" ? "number" : "text"}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          value={value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
          }
        />
      )}

      {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
    </div>
  );
}

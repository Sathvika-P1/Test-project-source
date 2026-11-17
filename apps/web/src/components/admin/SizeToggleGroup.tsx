import { SIZES, type Size } from "@/lib/catalogueApi";

export function SizeToggleGroup({
  value,
  onChange,
}: {
  value: Size[];
  onChange: (next: Size[]) => void;
}) {
  return (
    <div className="opts" id="f-sizes" tabIndex={-1}>
      {SIZES.map((size) => (
        <label key={size}>
          <input
            type="checkbox"
            value={size}
            checked={value.includes(size)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, size] : value.filter((s) => s !== size))
            }
          />
          <span>{size}</span>
        </label>
      ))}
    </div>
  );
}

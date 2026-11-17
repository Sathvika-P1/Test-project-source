export const MAX_IMAGES = 5;

/** Up to five image references (https URL or site path); the first is the main image. */
export function ImageSlotPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const slots = value.length ? value : [""];
  return (
    <div className="imgs" id="f-imgs" tabIndex={-1}>
      {slots.map((url, i) => (
        <div className="imgslot" key={i}>
          <input
            className="input"
            aria-label={`Image ${i + 1} URL`}
            placeholder={i === 0 ? "Main image URL" : "Image URL"}
            value={url}
            onChange={(e) => onChange(slots.map((u, j) => (j === i ? e.target.value : u)))}
          />
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-label={`Remove image ${i + 1}`}
            onClick={() => onChange(slots.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      {slots.length < MAX_IMAGES && (
        <button
          type="button"
          className="imgslot"
          aria-label="Add image"
          onClick={() => onChange([...slots, ""])}
        >
          <span>Add image</span>
        </button>
      )}
    </div>
  );
}

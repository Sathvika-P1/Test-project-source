"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createProduct, updateProduct } from "@/app/admin/products/actions";
import type { Product, ProductInput, Size, SubCategory } from "@/lib/catalogueApi";
import { ImageSlotPicker } from "./ImageSlotPicker";
import { SizeToggleGroup } from "./SizeToggleGroup";

type FieldKey = "name" | "brand" | "description" | "subCategoryId" | "price" | "sizes" | "images";
type Errors = Partial<Record<FieldKey, string>>;
type Status = "idle" | "saved" | "not-staff" | "error";

const MESSAGES: Record<FieldKey, string> = {
  name: "Enter a product name.",
  brand: "Enter a brand.",
  description: "Add a short description.",
  subCategoryId: "Choose a sub-category. A product can't be saved without one.",
  price: "Enter a price like 1899.",
  sizes: "Pick at least one size.",
  images: "Add at least one image.",
};
/** Control id for each field, in on-screen order (used to focus the first invalid one). */
const CONTROL_IDS: Record<FieldKey, string> = {
  name: "f-name",
  brand: "f-brand",
  description: "f-desc",
  subCategoryId: "f-sub",
  price: "f-price",
  sizes: "f-sizes",
  images: "f-imgs",
};
const ORDER = Object.keys(MESSAGES) as FieldKey[];

export function ProductForm({
  subCategories,
  product,
}: {
  subCategories: SubCategory[];
  product?: Product;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [subCategoryId, setSubCategoryId] = useState(product?.subCategoryId ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [sizes, setSizes] = useState<Size[]>(product?.sizes ?? []);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  const groups = [...new Set(subCategories.map((s) => s.topLevel))];

  function validate(): { errors: Errors; input?: ProductInput } {
    const numericPrice = Number(price);
    const cleanImages = images.map((i) => i.trim()).filter(Boolean);
    const found: Errors = {};
    if (!name.trim()) found.name = MESSAGES.name;
    if (!brand.trim()) found.brand = MESSAGES.brand;
    if (!description.trim()) found.description = MESSAGES.description;
    if (!subCategoryId) found.subCategoryId = MESSAGES.subCategoryId;
    if (!(numericPrice > 0)) found.price = MESSAGES.price;
    if (!sizes.length) found.sizes = MESSAGES.sizes;
    if (!cleanImages.length) found.images = MESSAGES.images;
    if (Object.keys(found).length) return { errors: found };
    return {
      errors: found,
      input: {
        name: name.trim(),
        brand: brand.trim(),
        description: description.trim(),
        subCategoryId,
        price: numericPrice,
        sizes,
        images: cleanImages,
      },
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const result = validate();
    setErrors(result.errors);
    const first = ORDER.find((k) => result.errors[k]);
    if (first) {
      document.getElementById(CONTROL_IDS[first])?.focus();
      return;
    }
    const input = result.input!;
    startTransition(async () => {
      const saved = product ? await updateProduct(product.id, input) : await createProduct(input);
      if (saved.ok) {
        setStatus("saved");
        return;
      }
      if (saved.reason === "invalid" && saved.fields) {
        const fromApi: Errors = {};
        for (const k of ORDER) if (saved.fields[k]) fromApi[k] = MESSAGES[k];
        setErrors(fromApi);
      }
      setStatus(saved.reason === "not-staff" ? "not-staff" : "error");
    });
  }

  const invalid = (k: FieldKey) => (errors[k] ? "is-invalid" : "");
  const err = (k: FieldKey, id: string) =>
    errors[k] && (
      <p className="field-error" id={id}>
        {errors[k]}
      </p>
    );

  return (
    <>
      {status === "not-staff" && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-title">Not saved</span> Only store staff can change products. Your
          account is a shopper account, so this product was not saved.
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-title">Not saved</span> Something went wrong. Check the details and
          try again.
        </div>
      )}
      {status === "saved" && (
        <div className="alert alert-success" role="status">
          <span className="alert-title">Saved</span> The storefront shows the latest details.{" "}
          <Link className="btn btn-ghost" href="/shop">
            View on storefront
          </Link>
        </div>
      )}
      <form className="form" noValidate onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input
            className={`input ${invalid("name")}`}
            id="f-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby="e-name"
          />
          {err("name", "e-name")}
        </div>
        <div className="field">
          <label htmlFor="f-brand">Brand</label>
          <input
            className={`input ${invalid("brand")}`}
            id="f-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-describedby="e-brand"
          />
          {err("brand", "e-brand")}
        </div>
        <div className="field">
          <label htmlFor="f-desc">Description</label>
          <textarea
            className={`textarea ${invalid("description")}`}
            id="f-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-describedby="e-desc"
          />
          {err("description", "e-desc")}
        </div>
        <div className="field">
          <label htmlFor="f-sub">Sub-category</label>
          <select
            className={`select ${invalid("subCategoryId")}`}
            id="f-sub"
            value={subCategoryId}
            onChange={(e) => setSubCategoryId(e.target.value)}
            aria-describedby="h-sub e-sub"
          >
            <option value="">Choose a sub-category</option>
            {groups.map((top) => (
              <optgroup key={top} label={top}>
                {subCategories
                  .filter((s) => s.topLevel === top)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {top} / {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="field-hint" id="h-sub">
            Each product is in exactly one sub-category.
          </p>
          {err("subCategoryId", "e-sub")}
        </div>
        <div className="field">
          <label htmlFor="f-price">Price (₹)</label>
          <input
            className={`input ${invalid("price")}`}
            id="f-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-describedby="e-price"
          />
          {err("price", "e-price")}
        </div>
        <fieldset aria-describedby="e-sizes">
          <legend>Sizes</legend>
          <SizeToggleGroup value={sizes} onChange={setSizes} />
          {err("sizes", "e-sizes")}
        </fieldset>
        <fieldset aria-describedby="e-imgs">
          <legend>Images</legend>
          <ImageSlotPicker value={images} onChange={setImages} />
          <p className="field-hint">Up to 5 images. The first one is the main image.</p>
          {err("images", "e-imgs")}
        </fieldset>
        <div className="formbar">
          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save product"}
          </button>
          <Link className="btn btn-secondary" href="/admin/products">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

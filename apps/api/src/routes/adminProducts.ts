import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import {
  SIZES,
  UnknownSubCategoryError,
  type ProductInput,
  type ProductStore,
} from '../products/types.js';

const text = { type: 'string', minLength: 1, pattern: '\\S' };
const props = {
  name: text,
  brand: text,
  description: text,
  subCategoryId: text,
  price: { type: 'number', exclusiveMinimum: 0 },
  sizes: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: [...SIZES] } },
  images: { type: 'array', minItems: 1, maxItems: 5, items: text },
};

const createSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(props),
    properties: props,
  },
};
const patchSchema = {
  body: { type: 'object', additionalProperties: false, minProperties: 1, properties: props },
};

const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

function trimmed<T extends Partial<ProductInput>>(body: T): T {
  const out: Record<string, unknown> = { ...body };
  for (const k of ['name', 'brand', 'description', 'subCategoryId'] as const) {
    if (typeof out[k] === 'string') out[k] = (out[k] as string).trim();
  }
  if (Array.isArray(out.images)) out.images = out.images.map((i: string) => i.trim());
  return out as T;
}

function invalid(reply: FastifyReply, fields: Record<string, string>) {
  return reply.code(400).send({ error: 'invalid', fields });
}

/** Registered INSIDE the gated admin scope: the one requireAdmin hook protects every route here. */
export async function adminProductRoutes(
  app: FastifyInstance,
  opts: { productStore: ProductStore },
): Promise<void> {
  const { productStore: store } = opts;

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err.validation) {
      const fields: Record<string, string> = {};
      for (const v of err.validation) {
        const missing = (v.params as { missingProperty?: string; additionalProperty?: string });
        const key =
          missing.missingProperty ??
          missing.additionalProperty ??
          v.instancePath.split('/')[1] ??
          'body';
        fields[key] = v.message ?? 'invalid';
      }
      return invalid(reply, fields);
    }
    req.log.error({ err }, 'admin product route failed');
    return reply.code(err.statusCode && err.statusCode < 500 ? err.statusCode : 500).send({ error: 'error' });
  });

  app.get('/admin/sub-categories', async () => store.listSubCategories());
  app.get('/admin/products', async () => store.list());

  app.get<{ Params: { id: string } }>('/admin/products/:id', async (req, reply) => {
    const product = await store.get(req.params.id);
    return product ?? reply.code(404).send({ error: 'not-found' });
  });

  app.post<{ Body: ProductInput }>('/admin/products', { schema: createSchema }, async (req, reply) => {
    const input = trimmed(req.body);
    if (!hasAtMostTwoDecimals(input.price)) return invalid(reply, { price: 'at most 2 decimals' });
    try {
      return reply.code(201).send(await store.create(input));
    } catch (err) {
      if (err instanceof UnknownSubCategoryError) return invalid(reply, { subCategoryId: 'unknown sub-category' });
      throw err;
    }
  });

  app.patch<{ Params: { id: string }; Body: Partial<ProductInput> }>(
    '/admin/products/:id',
    { schema: patchSchema },
    async (req, reply) => {
      const patch = trimmed(req.body);
      if (patch.price !== undefined && !hasAtMostTwoDecimals(patch.price)) {
        return invalid(reply, { price: 'at most 2 decimals' });
      }
      try {
        const product = await store.update(req.params.id, patch);
        return product ?? reply.code(404).send({ error: 'not-found' });
      } catch (err) {
        if (err instanceof UnknownSubCategoryError) return invalid(reply, { subCategoryId: 'unknown sub-category' });
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>('/admin/products/:id', async (req, reply) => {
    return (await store.remove(req.params.id))
      ? reply.code(204).send()
      : reply.code(404).send({ error: 'not-found' });
  });
}

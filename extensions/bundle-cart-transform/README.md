# Bundle Cart Transform Function (customized bundles)

> **Status: reference scaffold — NOT yet a wired, compiled extension.**
> Fixed bundles are published via the native `productBundleCreate` mutation
> (see `app/services/publish.server.ts`), which uses Shopify's **managed** cart
> transform — no custom function required. This folder is for **customized /
> mix-and-match** bundles, which DO need a custom Cart Transform Function.
>
> A Function compiles to WebAssembly and runs in Shopify's checkout sandbox. It
> cannot be typechecked by the app's `tsc` or verified without the Shopify CLI,
> so the steps below must be run in a real dev environment.

## How to turn this into a real extension

1. Add the access scope in `shopify.app.toml`:
   ```toml
   scopes = "read_products,write_products,write_cart_transforms"
   ```
2. Generate the function scaffold (creates the correct, current
   `shopify.extension.toml`, `package.json`, and `generated/` types):
   ```bash
   shopify app generate extension --template cart_transform_api
   ```
   Name it `bundle-cart-transform`.
3. Replace the generated `src/run.graphql` and `src/run.{ts,js}` with the
   reference files here (`run.graphql`, `run.js`).
4. Generate input types and build/test against fixtures:
   ```bash
   shopify app function typegen
   shopify app function run        # runs against test input
   ```
5. Register the cart transform on each shop once (e.g. from an `afterAuth` hook
   or a publish step) so the function is active:
   ```graphql
   mutation { cartTransformCreate(functionId: "<FUNCTION_ID>") {
     cartTransform { id } userErrors { field message } } }
   ```

## Model used here: `expand`

This reference uses the **expand** operation: a single "bundle" variant in the
cart is expanded into its component line items at checkout. Component variant
GIDs + quantities are read from metafields on the bundle variant (the publish
step would project them there). For true **mix-and-match merge** (combining
separately-added lines into one bundle line) you'd use the `merge` operation
instead, which additionally requires a `parentVariantId`.

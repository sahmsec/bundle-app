// Load App Bridge's global JSX types (e.g. <s-app-nav>) explicitly. These ship
// as a `declare global` augmentation in @shopify/app-bridge-types, so without an
// explicit reference they only load as a side effect of importing
// @shopify/app-bridge-react somewhere — a fragile coupling. Reference it here so
// the App Bridge web-component element types are always available.
/// <reference types="@shopify/app-bridge-types" />

declare module "*.css";

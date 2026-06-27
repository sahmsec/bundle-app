import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">📦</span>
          <span className={styles.brandName}>Bundle Builder</span>
        </div>

        <h1 className={styles.heading}>Sell more with product bundles</h1>
        <p className={styles.subhead}>
          Group products together, set a discount, and let Shopify handle pricing
          at checkout — bundles that just work, no theme code required.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label} htmlFor="shop">
              Shop domain
            </label>
            <div className={styles.inputRow}>
              <input
                id="shop"
                className={styles.input}
                type="text"
                name="shop"
                placeholder="my-store.myshopify.com"
                autoComplete="off"
              />
              <button className={styles.button} type="submit">
                Log in
              </button>
            </div>
            <span className={styles.hint}>
              Enter your store to install or open the app.
            </span>
          </Form>
        )}

        <ul className={styles.features}>
          <li>
            <strong>Fast setup.</strong> Build a bundle and pick products in
            minutes.
          </li>
          <li>
            <strong>Automatic discounts.</strong> Shopify groups and prices
            bundles natively at checkout.
          </li>
          <li>
            <strong>Built-in analytics.</strong> Track revenue, orders, and views
            per bundle.
          </li>
        </ul>
      </main>
    </div>
  );
}

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
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">B</span>
          <span className={styles.brandName}>Bundle&nbsp;Builder</span>
        </div>
        <nav className={styles.navRight}>
          <span className={styles.navTag}>PRODUCT&nbsp;BUNDLES</span>
          <a className={styles.navLink} href="#install">
            Open app →
          </a>
        </nav>
      </header>

      <main className={styles.hero}>
        <p className={styles.eyebrow}>Bundling — built for Shopify</p>

        <h1 className={styles.headline}>
          Sell more,
          <br />
          <span className={styles.accent}>bundled.</span>
        </h1>

        <p className={styles.subhead}>
          Group products, set a discount, and let Shopify price the bundle right
          at checkout. No theme code. No headaches.
        </p>

        {showForm && (
          <Form
            id="install"
            className={styles.install}
            method="post"
            action="/auth/login"
          >
            <input
              className={styles.input}
              type="text"
              name="shop"
              placeholder="your-store.myshopify.com"
              autoComplete="off"
              spellCheck={false}
            />
            <button className={styles.button} type="submit">
              Open
            </button>
          </Form>
        )}

        <p className={styles.micro}>
          One-click install <span className={styles.dot}>·</span> free forever{" "}
          <span className={styles.dot}>·</span> uninstall anytime
        </p>

        <ul className={styles.features}>
          <li>
            <span className={styles.featNum}>01</span> Build a bundle &amp; pick
            products in minutes
          </li>
          <li>
            <span className={styles.featNum}>02</span> Discounts apply
            automatically at checkout
          </li>
          <li>
            <span className={styles.featNum}>03</span> Track revenue &amp; views
            per bundle
          </li>
        </ul>
      </main>
    </div>
  );
}

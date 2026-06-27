import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getDashboardOverview } from "../services/dashboard.server";
import { MetricCard } from "../features/dashboard/components/MetricCard";
import { formatMoney, formatNumber } from "../utils/format";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Adapt the concrete Shopify client to our GraphqlClient abstraction at the
  // boundary, so the service stays decoupled from the framework.
  const overview = await getDashboardOverview(
    { graphql: (query, options) => admin.graphql(query, options) },
    session.shop,
  );

  return overview;
};

export default function Dashboard() {
  const { shop, metrics, hasBundles } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const goToCreate = () => navigate("/app/bundles/new");

  return (
    <s-page heading={shop.name ? `${shop.name} · Bundles` : "Bundles"}>
      <s-button slot="primary-action" variant="primary" onClick={goToCreate}>
        Create bundle
      </s-button>

      <s-section heading="Overview">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <MetricCard label="Total bundles" value={formatNumber(metrics.totalBundles)} />
          <MetricCard label="Active bundles" value={formatNumber(metrics.activeBundles)} />
          <MetricCard
            label="Revenue (all time)"
            value={formatMoney(metrics.totalRevenue, shop.currencyCode)}
          />
          <MetricCard label="Views (30 days)" value={formatNumber(metrics.views30d)} />
        </div>
      </s-section>

      {!hasBundles && (
        <s-section heading="Create your first bundle">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Bundles let merchants sell products together at a special price and
              have Shopify group them automatically at checkout. You don&apos;t
              have any bundles yet — create one to get started.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" onClick={goToCreate}>
                Create bundle
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

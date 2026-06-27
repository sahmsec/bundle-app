import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getDashboardOverview } from "../services/dashboard.server";
import { MetricCard } from "../features/dashboard/components/MetricCard";
import { EmptyState } from "../components/EmptyState";
import { formatMoney, formatNumber } from "../utils/format";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

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
    <s-page heading={shop.name ?? "Bundles"}>
      <s-button slot="primary-action" variant="primary" onClick={goToCreate}>
        Create bundle
      </s-button>

      <s-section heading="Overview">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <MetricCard
            icon="package"
            tone="info"
            label="Total bundles"
            value={formatNumber(metrics.totalBundles)}
          />
          <MetricCard
            icon="check-circle"
            tone="success"
            label="Active bundles"
            value={formatNumber(metrics.activeBundles)}
          />
          <MetricCard
            icon="cash-dollar"
            tone="success"
            label="Revenue · all time"
            value={formatMoney(metrics.totalRevenue, shop.currencyCode)}
          />
          <MetricCard
            icon="view"
            tone="neutral"
            label="Views · 30 days"
            value={formatNumber(metrics.views30d)}
          />
        </div>
      </s-section>

      {hasBundles ? (
        <s-section heading="Your bundles">
          <s-stack direction="block" gap="base">
            <s-text color="subdued">
              Create, edit, and publish bundles to your store.
            </s-text>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" onClick={goToCreate}>
                Create bundle
              </s-button>
              <s-button onClick={() => navigate("/app/bundles")}>
                View all bundles
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      ) : (
        <s-section>
          <EmptyState
            icon="package"
            heading="Create your first bundle"
            description="Group products together and sell them at a special price. Shopify groups them automatically at checkout — no theme code required."
            action={
              <s-button variant="primary" onClick={goToCreate}>
                Create bundle
              </s-button>
            }
          />
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

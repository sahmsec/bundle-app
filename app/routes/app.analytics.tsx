import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getShop } from "../services/shop.server";
import { getAnalyticsOverview } from "../services/analytics.server";
import { MetricCard } from "../features/dashboard/components/MetricCard";
import { RevenueChart } from "../features/analytics/components/RevenueChart";
import { formatMoney, formatNumber } from "../utils/format";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getShop(session.shop);
  const overview = await getAnalyticsOverview(shop.id, shop.currencyCode, 30);
  return overview;
};

export default function Analytics() {
  const { days, currencyCode, totalRevenue, totalOrders, totalUnits, series, topBundles } =
    useLoaderData<typeof loader>();

  const hasData = totalOrders > 0;

  return (
    <s-page heading="Analytics">
      <s-section heading={`Last ${days} days`}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <MetricCard label="Revenue" value={formatMoney(totalRevenue, currencyCode)} />
          <MetricCard label="Orders" value={formatNumber(totalOrders)} />
          <MetricCard label="Units sold" value={formatNumber(totalUnits)} />
        </div>
      </s-section>

      <s-section heading="Daily revenue">
        {hasData ? (
          <RevenueChart series={series} />
        ) : (
          <s-paragraph>
            No bundle sales yet. Once orders containing your bundles come in,
            revenue will appear here.
          </s-paragraph>
        )}
      </s-section>

      {topBundles.length > 0 && (
        <s-section heading="Top bundles">
          <s-table>
            <s-table-header-row>
              <s-table-header>Bundle</s-table-header>
              <s-table-header>Revenue</s-table-header>
              <s-table-header>Orders</s-table-header>
              <s-table-header>Units</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {topBundles.map((b) => (
                <s-table-row key={b.bundleId}>
                  <s-table-cell>
                    <s-link href={`/app/bundles/${b.bundleId}`}>{b.title}</s-link>
                  </s-table-cell>
                  <s-table-cell>{formatMoney(b.revenue, currencyCode)}</s-table-cell>
                  <s-table-cell>{formatNumber(b.orders)}</s-table-cell>
                  <s-table-cell>{formatNumber(b.units)}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

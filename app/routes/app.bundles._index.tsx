import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Form,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getShop } from "../services/shop.server";
import { listBundles } from "../services/bundle.server";
import { toBundleListItem } from "../utils/bundle-dto";
import { BUNDLE_STATUSES } from "../services/bundle.schema";
import { BundleStatusBadge } from "../features/bundles/components/BundleStatusBadge";
import { EmptyState } from "../components/EmptyState";
import { formatDate, formatMoney, formatNumber } from "../utils/format";
import type { BundleListItem } from "../types/bundle";

const SORT_FIELDS = ["createdAt", "updatedAt", "title"] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getShop(session.shop);

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() || undefined;

  const statusParam = params.get("status") ?? "";
  const status = (BUNDLE_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as (typeof BUNDLE_STATUSES)[number])
    : undefined;

  const sortParam = params.get("sort") ?? "createdAt";
  const sort = (SORT_FIELDS as readonly string[]).includes(sortParam)
    ? (sortParam as (typeof SORT_FIELDS)[number])
    : "createdAt";

  const order = params.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const result = await listBundles({ shopId: shop.id, q, status, sort, order, page });

  return {
    bundles: result.items.map(toBundleListItem),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
    currencyCode: shop.currencyCode,
    filters: { q: q ?? "", status: statusParam, sort, order },
  };
};

function pricingLabel(b: BundleListItem, currency: string | null): string {
  if (b.pricingType === "PERCENTAGE_DISCOUNT") return `${b.pricingValue}% off`;
  if (b.pricingType === "FIXED_PRICE") return formatMoney(b.pricingValue, currency);
  return `${formatMoney(b.pricingValue, currency)} off`;
}

export default function BundlesList() {
  const { bundles, total, page, pageCount, currencyCode, filters } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const isLoading = navigation.state === "loading";
  const hasFilters = Boolean(filters.q || filters.status);

  const gotoPage = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(target));
    navigate(`/app/bundles?${next.toString()}`);
  };

  return (
    <s-page heading="Bundles">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => navigate("/app/bundles/new")}
      >
        Create bundle
      </s-button>

      <s-section>
        <Form method="get">
          <s-stack direction="inline" gap="base">
            <s-search-field
              name="q"
              label="Search"
              value={filters.q}
              placeholder="Search by title"
            />
            <s-select name="status" label="Status">
              <s-option value="" defaultSelected={filters.status === ""}>
                All statuses
              </s-option>
              {BUNDLE_STATUSES.map((s) => (
                <s-option key={s} value={s} defaultSelected={filters.status === s}>
                  {s}
                </s-option>
              ))}
            </s-select>
            <s-select name="sort" label="Sort by">
              <s-option value="createdAt" defaultSelected={filters.sort === "createdAt"}>
                Newest
              </s-option>
              <s-option value="title" defaultSelected={filters.sort === "title"}>
                Title
              </s-option>
              <s-option value="updatedAt" defaultSelected={filters.sort === "updatedAt"}>
                Recently updated
              </s-option>
            </s-select>
            <s-select name="order" label="Order">
              <s-option value="desc" defaultSelected={filters.order === "desc"}>
                Descending
              </s-option>
              <s-option value="asc" defaultSelected={filters.order === "asc"}>
                Ascending
              </s-option>
            </s-select>
            <s-button type="submit">Apply</s-button>
            {hasFilters && (
              <s-button onClick={() => navigate("/app/bundles")}>Clear</s-button>
            )}
          </s-stack>
        </Form>
      </s-section>

      <s-section heading={`${formatNumber(total)} bundle${total === 1 ? "" : "s"}`}>
        {isLoading && <s-spinner accessibilityLabel="Loading bundles" />}

        {!isLoading && total === 0 && !hasFilters && (
          <EmptyState
            icon="package"
            heading="No bundles yet"
            description="Create your first bundle to start selling products together at a special price."
            action={
              <s-button variant="primary" onClick={() => navigate("/app/bundles/new")}>
                Create bundle
              </s-button>
            }
          />
        )}

        {!isLoading && total === 0 && hasFilters && (
          <EmptyState
            icon="search"
            heading="No matches"
            description="No bundles match your current filters."
            action={
              <s-button onClick={() => navigate("/app/bundles")}>Clear filters</s-button>
            }
          />
        )}

        {!isLoading && total > 0 && (
          <s-stack direction="block" gap="base">
            <s-table>
              <s-table-header-row>
                <s-table-header>Title</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Type</s-table-header>
                <s-table-header>Pricing</s-table-header>
                <s-table-header>Created</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {bundles.map((b) => (
                  <s-table-row key={b.id}>
                    <s-table-cell>
                      <s-link href={`/app/bundles/${b.id}`}>{b.title}</s-link>
                    </s-table-cell>
                    <s-table-cell>
                      <BundleStatusBadge status={b.status} />
                    </s-table-cell>
                    <s-table-cell>
                      {b.type === "FIXED" ? "Fixed" : "Build-a-box"}
                    </s-table-cell>
                    <s-table-cell>{pricingLabel(b, currencyCode)}</s-table-cell>
                    <s-table-cell>{formatDate(b.createdAt)}</s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            <s-stack direction="inline" gap="base">
              <s-button
                {...(page <= 1 ? { disabled: true } : {})}
                onClick={() => gotoPage(page - 1)}
              >
                Previous
              </s-button>
              <s-text>
                Page {page} of {pageCount}
              </s-text>
              <s-button
                {...(page >= pageCount ? { disabled: true } : {})}
                onClick={() => gotoPage(page + 1)}
              >
                Next
              </s-button>
            </s-stack>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

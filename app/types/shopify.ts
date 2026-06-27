/**
 * Minimal abstraction over Shopify's Admin GraphQL client.
 *
 * Services depend on THIS, not on `@shopify/shopify-app-react-router`'s concrete
 * `AdminApiContext`. That inversion (Dependency Inversion Principle) keeps our
 * business logic framework-agnostic and unit-testable with a fake client. Routes
 * adapt the real `admin` to this shape at the boundary.
 */
export interface GraphqlClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

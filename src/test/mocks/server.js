// The MSW server used by component/integration tests (Node/jsdom, not the
// browser). Wire its lifecycle into a test file like this:
//
//   import { server } from "../test/mocks/server";
//
//   beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
//   afterEach(() => server.resetHandlers());
//   afterAll(() => server.close());
//
// Then, inside a single test, override just the handler you care about:
//
//   server.use(
//     http.get("/order", () => new HttpResponse(null, { status: 401 })),
//   );
//
// It is not started from src/setupTests.js on purpose — only suites that
// actually render components and hit the network need it.
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

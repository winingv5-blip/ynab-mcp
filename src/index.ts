import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerScheduledTools } from "./tools/scheduled.js";
import { registerBudgetTools } from "./tools/budget.js";

const server = new McpServer({
  name: "ynab-mcp",
  version: "1.0.0",
});

registerAccountTools(server);
registerTransactionTools(server);
registerScheduledTools(server);
registerBudgetTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

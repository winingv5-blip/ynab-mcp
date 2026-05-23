## ADDED Requirements

### Requirement: MCP server initializes and registers all tools
The server SHALL initialize a `@modelcontextprotocol/sdk` MCP server instance, register all tools from each domain module, and start listening on stdio transport.

#### Scenario: Server starts successfully
- **WHEN** the server process is launched with a valid `YNAB_API_TOKEN` environment variable
- **THEN** the MCP server starts on stdio transport and all tools are discoverable by Claude

#### Scenario: Missing API token
- **WHEN** the server process is launched without `YNAB_API_TOKEN` set
- **THEN** the process exits with a non-zero code and a clear error message

### Requirement: YNAB client is initialized as a singleton
The server SHALL create a single YNAB API client instance using the `ynab` SDK, initialized from `YNAB_API_TOKEN`, and shared across all tool handlers.

#### Scenario: Client reuse across tool calls
- **WHEN** multiple tools are called in sequence
- **THEN** all calls use the same YNAB client instance (no re-initialization per call)

### Requirement: Milliunit conversion helpers are available globally
The server SHALL provide `toMilliunits(dollars: number): number` and `fromMilliunits(milliunits: number): number` helper functions accessible to all tool modules.

#### Scenario: Dollar to milliunit conversion
- **WHEN** `toMilliunits(13.50)` is called
- **THEN** it returns `13500`

#### Scenario: Milliunit to dollar conversion
- **WHEN** `fromMilliunits(45990)` is called
- **THEN** it returns `45.99`

#### Scenario: Negative amounts (outflows)
- **WHEN** `toMilliunits(-45.99)` is called
- **THEN** it returns `-45990`

### Requirement: Build produces a runnable Node.js script
The project SHALL include a `tsconfig.json` and `build` npm script that compiles TypeScript to JavaScript in a `dist/` directory, with `dist/index.js` as the entry point.

#### Scenario: Build succeeds on clean checkout
- **WHEN** `npm install && npm run build` is run in the project root
- **THEN** `dist/index.js` is produced with no TypeScript errors

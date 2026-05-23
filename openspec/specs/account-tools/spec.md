### Requirement: get_budgets tool lists all budgets
The server SHALL expose a `get_budgets` tool that returns all budgets accessible to the API token, including each budget's `id`, `name`, and `last_modified_on`.

#### Scenario: Budgets returned
- **WHEN** Claude calls `get_budgets` with no arguments
- **THEN** the tool returns a list of budgets with id, name, and last modified date

### Requirement: get_accounts tool lists accounts with balances
The server SHALL expose a `get_accounts` tool that returns all accounts in a budget with their name, type, current balance (in dollars), and whether they are on-budget.

#### Scenario: Accounts for last-used budget
- **WHEN** Claude calls `get_accounts` with no `budget_id`
- **THEN** the tool returns accounts from the last-used budget with balances in dollars

#### Scenario: Accounts for specific budget
- **WHEN** Claude calls `get_accounts` with a specific `budget_id`
- **THEN** the tool returns accounts from that budget

#### Scenario: Closed accounts excluded by default
- **WHEN** Claude calls `get_accounts` without specifying `include_closed`
- **THEN** only open (non-closed) accounts are returned

#### Scenario: Closed accounts included on request
- **WHEN** Claude calls `get_accounts` with `include_closed: true`
- **THEN** both open and closed accounts are returned

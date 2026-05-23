### Requirement: get_transactions tool retrieves transactions with filters
The server SHALL expose a `get_transactions` tool that returns transactions from a budget, supporting optional filters for `since_date` (YYYY-MM-DD), `account_name`, `category_name`, and `unapproved_only`.

#### Scenario: All transactions since a date
- **WHEN** Claude calls `get_transactions` with `since_date: "2026-05-01"`
- **THEN** the tool returns all transactions on or after that date

#### Scenario: Filter by account name
- **WHEN** Claude calls `get_transactions` with `account_name: "Checking"`
- **THEN** only transactions in the matching account are returned

#### Scenario: Filter unapproved only
- **WHEN** Claude calls `get_transactions` with `unapproved_only: true`
- **THEN** only transactions with `approved: false` are returned

#### Scenario: Amounts returned in dollars
- **WHEN** transactions are returned
- **THEN** all amounts are in dollars (not milliunits)

### Requirement: create_transaction tool creates simple and split transactions
The server SHALL expose a `create_transaction` tool that creates a new transaction. When `subtransactions` are provided, it creates a split transaction; otherwise a simple transaction.

#### Scenario: Create simple transaction
- **WHEN** Claude calls `create_transaction` with `account_name`, `date`, `amount`, and `payee_name`
- **THEN** a new transaction is created and its ID is returned

#### Scenario: Create split transaction
- **WHEN** Claude calls `create_transaction` with a `subtransactions` array whose amounts sum to the parent `amount`
- **THEN** a split transaction is created with the correct subtransactions

#### Scenario: Split amounts must sum to parent
- **WHEN** Claude calls `create_transaction` with subtransaction amounts that do not sum to the parent amount
- **THEN** the tool returns a validation error before calling the YNAB API

#### Scenario: Category resolved by name
- **WHEN** `category_name` is provided as a string
- **THEN** the tool resolves it to a category ID before creating the transaction

### Requirement: update_transaction tool modifies an existing transaction
The server SHALL expose an `update_transaction` tool that updates one or more fields of an existing transaction by ID. Updatable fields: `memo`, `category_name`, `flag_color`, `approved`, `cleared`.

#### Scenario: Update memo
- **WHEN** Claude calls `update_transaction` with a transaction `id` and new `memo`
- **THEN** the transaction memo is updated and the updated transaction is returned

#### Scenario: Approve a transaction
- **WHEN** Claude calls `update_transaction` with `approved: true`
- **THEN** the transaction is marked as approved in YNAB

### Requirement: approve_transactions tool bulk-approves unapproved transactions
The server SHALL expose an `approve_transactions` tool that fetches all unapproved transactions (optionally filtered by `account_name`) and approves them in a single bulk API call.

#### Scenario: Approve all unapproved
- **WHEN** Claude calls `approve_transactions` with no filters
- **THEN** all unapproved transactions across all accounts are approved

#### Scenario: Approve unapproved in one account
- **WHEN** Claude calls `approve_transactions` with `account_name: "Checking"`
- **THEN** only unapproved transactions in that account are approved

#### Scenario: No unapproved transactions
- **WHEN** Claude calls `approve_transactions` and there are no unapproved transactions
- **THEN** the tool returns a message indicating nothing to approve

### Requirement: delete_transaction tool removes a transaction
The server SHALL expose a `delete_transaction` tool that deletes a transaction by ID.

#### Scenario: Successful delete
- **WHEN** Claude calls `delete_transaction` with a valid transaction `id`
- **THEN** the transaction is deleted and a confirmation is returned

#### Scenario: Transaction not found
- **WHEN** Claude calls `delete_transaction` with an ID that does not exist
- **THEN** the YNAB API error is surfaced with a clear message

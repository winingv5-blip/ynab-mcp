## ADDED Requirements

### Requirement: get_scheduled_transactions tool lists recurring transactions
The server SHALL expose a `get_scheduled_transactions` tool that returns all scheduled transactions for a budget, including `id`, `date_next`, `frequency`, `amount` (dollars), `account_name`, `category_name`, `payee_name`, and `memo`.

#### Scenario: All scheduled transactions returned
- **WHEN** Claude calls `get_scheduled_transactions`
- **THEN** all scheduled transactions are returned with amounts in dollars and human-readable frequency labels

#### Scenario: Amounts in dollars
- **WHEN** scheduled transactions are returned
- **THEN** amounts are in dollars, not milliunits

### Requirement: create_scheduled_transaction tool creates a new recurring transaction
The server SHALL expose a `create_scheduled_transaction` tool that creates a scheduled transaction with required fields: `account_name`, `date_first` (YYYY-MM-DD), `frequency`, `amount`, `payee_name`, and optional `category_name` and `memo`.

Valid `frequency` values: `never`, `daily`, `weekly`, `every_other_week`, `twice_a_month`, `every_4_weeks`, `monthly`, `every_3_months`, `every_6_months`, `yearly`.

#### Scenario: Create monthly bill
- **WHEN** Claude calls `create_scheduled_transaction` with frequency `monthly` and a future `date_first`
- **THEN** a new scheduled transaction is created and its ID is returned

#### Scenario: Invalid frequency rejected
- **WHEN** Claude calls `create_scheduled_transaction` with an unrecognized frequency value
- **THEN** the tool returns a validation error listing valid options

### Requirement: update_scheduled_transaction tool modifies a recurring transaction
The server SHALL expose an `update_scheduled_transaction` tool that updates fields of an existing scheduled transaction by ID. Updatable fields: `amount`, `date_next`, `frequency`, `memo`, `category_name`, `payee_name`.

#### Scenario: Update subscription amount
- **WHEN** Claude calls `update_scheduled_transaction` with a new `amount`
- **THEN** the scheduled transaction amount is updated

#### Scenario: Change next occurrence date
- **WHEN** Claude calls `update_scheduled_transaction` with a new `date_next`
- **THEN** the next scheduled date is updated

### Requirement: delete_scheduled_transaction tool cancels a recurring transaction
The server SHALL expose a `delete_scheduled_transaction` tool that deletes a scheduled transaction by ID.

#### Scenario: Successful cancellation
- **WHEN** Claude calls `delete_scheduled_transaction` with a valid `id`
- **THEN** the scheduled transaction is deleted and a confirmation is returned

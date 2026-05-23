### Requirement: get_categories tool lists all budget categories
The server SHALL expose a `get_categories` tool that returns all category groups and their categories, including each category's `name`, `budgeted` (dollars), `activity` (dollars), and `balance` (dollars) for the current month.

#### Scenario: All categories returned
- **WHEN** Claude calls `get_categories`
- **THEN** all non-hidden category groups and their categories are returned with dollar amounts

#### Scenario: Internal YNAB categories excluded
- **WHEN** categories are returned
- **THEN** the internal "Internal Master Category" group is excluded from results

### Requirement: get_month_summary tool returns monthly budget overview
The server SHALL expose a `get_month_summary` tool that returns a summary for a given month (defaulting to current month), including `income`, `budgeted`, `activity`, `to_be_budgeted`, and `age_of_money` in dollars.

#### Scenario: Current month summary
- **WHEN** Claude calls `get_month_summary` with no arguments
- **THEN** the current month's summary is returned

#### Scenario: Specific month summary
- **WHEN** Claude calls `get_month_summary` with `month: "2026-04-01"`
- **THEN** April 2026's summary is returned

### Requirement: update_category_budget tool sets a category's budgeted amount
The server SHALL expose an `update_category_budget` tool that sets the budgeted amount for a named category in a given month (defaulting to current month).

#### Scenario: Set grocery budget
- **WHEN** Claude calls `update_category_budget` with `category_name: "Groceries"` and `amount: 500`
- **THEN** the Groceries category budgeted amount is set to $500 for the current month

#### Scenario: Category name not found
- **WHEN** Claude calls `update_category_budget` with a `category_name` that matches no category
- **THEN** the tool returns an error listing similar category names

### Requirement: move_money tool transfers budget between categories
The server SHALL expose a `move_money` tool that moves a dollar amount from one category to another within the same month, or to/from "Ready to Assign" (using the category name `"Ready to Assign"`).

#### Scenario: Move between two categories
- **WHEN** Claude calls `move_money` with `from_category: "Dining Out"`, `to_category: "Groceries"`, and `amount: 50`
- **THEN** $50 is subtracted from Dining Out's budgeted amount and added to Groceries' budgeted amount

#### Scenario: Move from Ready to Assign
- **WHEN** Claude calls `move_money` with `from_category: "Ready to Assign"` and a destination category
- **THEN** the destination category's budgeted amount increases by the specified amount

#### Scenario: Insufficient funds in source category
- **WHEN** Claude calls `move_money` and the source category balance is less than the requested amount
- **THEN** the tool proceeds with the move (YNAB allows negative category balances) and warns the user the source will go negative
